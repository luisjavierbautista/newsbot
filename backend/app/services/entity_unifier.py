import json
import logging
from typing import Optional
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import get_settings
from app.models import Entity

logger = logging.getLogger(__name__)


class EntityUnifier:
    """Servicio para unificar entidades duplicadas usando Gemini AI."""

    UNIFY_PROMPT = """Analiza la siguiente lista de entidades extraídas de noticias y agrúpalas por entidad real.
Muchas son la misma entidad con diferentes nombres (ej: "Trump", "Donald Trump", "Donald J. Trump" son la misma persona).

ENTIDADES A ANALIZAR:
{entities}

INSTRUCCIONES:
1. Agrupa las entidades que se refieren a la misma persona/lugar/organización
2. Para cada grupo, elige el nombre CANÓNICO más completo y formal
3. Solo agrupa entidades del MISMO TIPO (no mezcles personas con lugares)
4. Si una entidad es única y no tiene duplicados, no la incluyas

Responde SOLO con JSON válido (sin markdown):
{{
    "groups": [
        {{
            "canonical": "Nombre canónico completo",
            "type": "person|organization|country|city|place",
            "variants": ["variante1", "variante2", "variante3"]
        }}
    ]
}}

EJEMPLOS de agrupaciones correctas:
- "Trump", "Donald Trump", "Donald J. Trump" → canonical: "Donald Trump"
- "EEUU", "Estados Unidos", "EE.UU.", "USA" → canonical: "Estados Unidos"
- "Maduro", "Nicolás Maduro" → canonical: "Nicolás Maduro"
- "ONU", "Naciones Unidas" → canonical: "Organización de las Naciones Unidas"

Solo incluye grupos donde hay AL MENOS 2 variantes."""

    def __init__(self):
        self.settings = get_settings()
        if self.settings.gemini_api_key:
            genai.configure(api_key=self.settings.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.model = None
            logger.warning("Gemini API key not configured")

    async def get_entity_groups(self, db: Session, entity_type: Optional[str] = None, min_count: int = 2) -> list[dict]:
        """Obtiene entidades agrupadas por tipo para análisis."""
        query = db.query(
            Entity.entity_type,
            Entity.entity_value,
            func.count(Entity.id).label("count")
        ).group_by(Entity.entity_type, Entity.entity_value)

        if entity_type:
            query = query.filter(Entity.entity_type == entity_type)

        query = query.having(func.count(Entity.id) >= min_count)
        query = query.order_by(Entity.entity_type, func.count(Entity.id).desc())

        results = query.limit(200).all()

        # Group by type
        by_type = {}
        for r in results:
            if r.entity_type not in by_type:
                by_type[r.entity_type] = []
            by_type[r.entity_type].append({
                "value": r.entity_value,
                "count": r.count
            })

        return by_type

    async def analyze_duplicates(self, db: Session, entity_type: Optional[str] = None) -> dict:
        """Usa Gemini para identificar entidades duplicadas."""
        if not self.model:
            return {"error": "Gemini not configured"}

        entities_by_type = await self.get_entity_groups(db, entity_type)

        all_groups = []

        for etype, entities in entities_by_type.items():
            if len(entities) < 2:
                continue

            # Format entities for the prompt
            entity_list = "\n".join([
                f"- {e['value']} (tipo: {etype}, apariciones: {e['count']})"
                for e in entities[:100]  # Limit to avoid token limits
            ])

            prompt = self.UNIFY_PROMPT.format(entities=entity_list)

            try:
                response = self.model.generate_content(prompt)
                result_text = response.text.strip()

                # Clean markdown if present
                if result_text.startswith("```"):
                    result_text = result_text.split("```")[1]
                    if result_text.startswith("json"):
                        result_text = result_text[4:]
                    result_text = result_text.strip()

                # Extract JSON
                if not result_text.startswith("{"):
                    start = result_text.find("{")
                    if start != -1:
                        result_text = result_text[start:]
                if not result_text.endswith("}"):
                    end = result_text.rfind("}")
                    if end != -1:
                        result_text = result_text[:end + 1]

                result = json.loads(result_text)
                groups = result.get("groups", [])

                for group in groups:
                    group["type"] = etype
                    all_groups.append(group)

            except Exception as e:
                logger.error(f"Error analyzing entities of type {etype}: {e}")

        return {
            "groups": all_groups,
            "total_groups": len(all_groups)
        }

    async def unify_entities(self, db: Session, groups: list[dict], dry_run: bool = True) -> dict:
        """Unifica entidades basándose en los grupos identificados."""
        updates = []

        for group in groups:
            canonical = group.get("canonical")
            variants = group.get("variants", [])

            if not canonical or not variants:
                continue

            for variant in variants:
                if variant == canonical:
                    continue

                # Count how many will be updated
                count = db.query(Entity).filter(
                    Entity.entity_value == variant
                ).count()

                if count > 0:
                    updates.append({
                        "from": variant,
                        "to": canonical,
                        "count": count
                    })

                    if not dry_run:
                        db.query(Entity).filter(
                            Entity.entity_value == variant
                        ).update({"entity_value": canonical})

        if not dry_run:
            db.commit()
            logger.info(f"Unified {len(updates)} entity variants")

        return {
            "dry_run": dry_run,
            "updates": updates,
            "total_updates": sum(u["count"] for u in updates)
        }


# Global instance
entity_unifier = EntityUnifier()
