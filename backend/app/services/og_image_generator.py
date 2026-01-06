"""
OG Image Generator Service

Uses Google Gemini 2.5 Flash Image (Nano Banana) for base backgrounds and Pillow for text overlays.
Generates consistent, branded Open Graph images for social sharing.
"""
import io
import os
import logging
import hashlib
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
from google import genai
from app.config import get_settings

logger = logging.getLogger(__name__)

# Cache directory for generated images
CACHE_DIR = Path("/tmp/og_cache")
CACHE_DIR.mkdir(exist_ok=True)

# Base image cache (Imagen-generated backgrounds)
BASE_IMAGES_DIR = Path("/tmp/og_base")
BASE_IMAGES_DIR.mkdir(exist_ok=True)

# OG Image dimensions (standard)
OG_WIDTH = 1200
OG_HEIGHT = 630

# Brand colors
BRAND_COLORS = {
    "dark_bg": (15, 23, 42),       # #0f172a - slate-900
    "primary": (56, 189, 248),      # #38bdf8 - sky-400
    "accent": (129, 140, 248),      # #818cf8 - indigo-400
    "white": (255, 255, 255),
    "gray": (148, 163, 184),        # #94a3b8 - slate-400
    "green": (34, 197, 94),         # #22c55e - green-500
}

# Page-specific AI prompts for FULL AI generation (no text overlay)
# IMPORTANT: Emphasize LARGE, BOLD, READABLE text that invites users to click
AI_PAGE_PROMPTS = {
    "home": """Create a visually stunning Open Graph social media preview image.

CRITICAL TEXT REQUIREMENTS (MOST IMPORTANT):
- VERY LARGE, BOLD white text "LatBot.news" centered prominently (this must be the focal point!)
- Large compelling tagline below: "Tu Portal de Noticias con IA"
- Text must be HUGE and easily readable even as a small thumbnail
- Add an inviting call-to-action feel: "Descubre las noticias de LATAM"

DESIGN:
- Dark cinematic gradient background (deep navy #0f172a to purple)
- Glowing cyan/purple accents around the text
- Futuristic AI/tech aesthetic with subtle geometric elements
- Professional news media feel
- Size: 1200x630 pixels

The text should be SO LARGE it dominates the image and makes people want to click!
""",
    "facts": """Create a visually stunning Open Graph social media preview image for a Facts page.

CRITICAL TEXT REQUIREMENTS (MOST IMPORTANT):
- VERY LARGE, BOLD white text "HECHOS VERIFICADOS" as the main headline (huge, centered!)
- Smaller but still large "LatBot.news" branding above
- Inviting tagline: "La verdad detrás de las noticias"
- Text must be ENORMOUS and readable even as thumbnail
- Add sparkle/checkmark visual elements near the text

DESIGN:
- Dark gradient with purple/indigo magical tones
- Glowing verification checkmarks or sparkles
- Timeline or data visualization elements in background
- Size: 1200x630 pixels

Make the text HUGE and inviting - users should feel compelled to click!
""",
    "sources": """Create a visually stunning Open Graph social media preview image for a Sources Analysis page.

CRITICAL TEXT REQUIREMENTS (MOST IMPORTANT):
- VERY LARGE, BOLD white text "ANÁLISIS DE MEDIOS" as main headline (huge!)
- "LatBot.news" branding prominently displayed
- Compelling tagline: "¿Quién dice qué? Descúbrelo aquí"
- Text must be MASSIVE and readable as small thumbnail

DESIGN:
- Dark gradient with teal/cyan glowing accents
- Abstract newspaper/media grid patterns in background
- Balance scale or comparison visual elements subtly
- Professional news aesthetic
- Size: 1200x630 pixels

Text should be the DOMINANT element - make people curious to explore!
""",
    "entities": """Create a visually stunning Open Graph social media preview image for an Entity Network page.

CRITICAL TEXT REQUIREMENTS (MOST IMPORTANT):
- VERY LARGE, BOLD white text "RED DE CONEXIONES" as main headline (huge, glowing!)
- "LatBot.news" branding visible
- Inviting tagline: "Descubre quién se conecta con quién"
- Text must be ENORMOUS and eye-catching

DESIGN:
- Dark gradient with connected glowing nodes/network visualization
- Purple/cyan color scheme with neon accents
- Graph/network lines connecting around the text
- Futuristic data visualization aesthetic
- Size: 1200x630 pixels

The text should GLOW and make users excited to explore the connections!
""",
    "article": """Create a visually stunning Open Graph social media preview image for a news article.

CRITICAL TEXT REQUIREMENTS (MOST IMPORTANT):
- VERY LARGE, BOLD white text "ÚLTIMA HORA" or "NOTICIA VERIFICADA" (huge, dramatic!)
- "LatBot.news" branding prominently displayed
- Green "✓ VERIFICADO" badge, large and visible
- Inviting feel: "Lee el análisis completo"
- Text must be MASSIVE and create urgency

DESIGN:
- Dark dramatic cinematic gradient background
- Breaking news aesthetic with red/orange subtle accents
- Professional, trustworthy but urgent appearance
- Glowing elements around text
- Size: 1200x630 pixels

Create URGENCY with huge text - make people feel they need to read this NOW!
""",
    "default": """Create a visually stunning Open Graph social media preview image.

CRITICAL TEXT REQUIREMENTS (MOST IMPORTANT):
- VERY LARGE, BOLD white text "LatBot.news" centered (this is the star!)
- Large tagline: "Noticias Inteligentes de LATAM y USA"
- Text must be HUGE, bold, and impossible to miss
- Inviting message: "Explora las noticias con IA"

DESIGN:
- Dark cinematic gradient (navy to purple)
- Glowing tech/AI aesthetic with geometric elements
- Futuristic, modern news portal feel
- Cyan and purple accent glows
- Size: 1200x630 pixels

The text should be SO LARGE and inviting that everyone wants to click!
"""
}

# Prompts for BACKGROUND only (used with text overlay)
BACKGROUND_PROMPTS = {
    "breaking": """Dark dramatic background for breaking news. Deep red and dark blue gradient with subtle urgent energy lines. No text. Professional news aesthetic.""",
    "politics": """Sophisticated dark background for political news. Navy blue gradient with subtle governmental/diplomatic geometric patterns. No text. Serious tone.""",
    "tech": """Modern dark tech background. Deep blue/purple gradient with subtle circuit-like patterns and soft glowing nodes. No text. AI/technology feel.""",
    "default": """Create a modern, professional background for a news website.
Style: Dark gradient background (deep navy blue to slate), subtle abstract geometric shapes, minimalist design, tech/AI aesthetic with soft glowing elements. No text, no logos. Aspect ratio: 1200x630."""
}


class OGImageGenerator:
    """Generates Open Graph images for social sharing."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None
        if self.settings.gemini_api_key:
            self._client = genai.Client(api_key=self.settings.gemini_api_key)
        self._font_cache = {}

    def _get_font(self, size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
        """Get font with caching. Falls back to default if custom fonts not available."""
        cache_key = f"{size}_{bold}"
        if cache_key in self._font_cache:
            return self._font_cache[cache_key]

        # Try to load Inter font or fallback to default
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/TTF/DejaVuSans.ttf",
        ]

        for path in font_paths:
            if os.path.exists(path):
                try:
                    font = ImageFont.truetype(path, size)
                    self._font_cache[cache_key] = font
                    return font
                except Exception:
                    continue

        # Fallback to default
        font = ImageFont.load_default()
        self._font_cache[cache_key] = font
        return font

    def _create_gradient_background(self) -> Image.Image:
        """Create a gradient background programmatically (fallback if Imagen unavailable)."""
        img = Image.new('RGB', (OG_WIDTH, OG_HEIGHT), BRAND_COLORS["dark_bg"])
        draw = ImageDraw.Draw(img)

        # Create vertical gradient
        for y in range(OG_HEIGHT):
            # Interpolate between dark_bg and slightly lighter
            ratio = y / OG_HEIGHT
            r = int(BRAND_COLORS["dark_bg"][0] + (30 - BRAND_COLORS["dark_bg"][0]) * ratio * 0.3)
            g = int(BRAND_COLORS["dark_bg"][1] + (41 - BRAND_COLORS["dark_bg"][1]) * ratio * 0.3)
            b = int(BRAND_COLORS["dark_bg"][2] + (59 - BRAND_COLORS["dark_bg"][2]) * ratio * 0.3)
            draw.line([(0, y), (OG_WIDTH, y)], fill=(r, g, b))

        # Add subtle accent circles
        for x, y, r, color, alpha in [
            (100, 100, 200, BRAND_COLORS["primary"], 30),
            (OG_WIDTH - 150, OG_HEIGHT - 100, 250, BRAND_COLORS["accent"], 25),
        ]:
            overlay = Image.new('RGBA', (OG_WIDTH, OG_HEIGHT), (0, 0, 0, 0))
            overlay_draw = ImageDraw.Draw(overlay)
            overlay_draw.ellipse([x-r, y-r, x+r, y+r], fill=(*color, alpha))
            img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

        return img

    async def generate_full_ai_image(self, page: str = "default") -> Optional[Image.Image]:
        """Generate a complete OG image using Gemini 2.5 Flash Image."""
        try:
            if not self._client:
                logger.warning("Gemini client not configured")
                return None

            prompt = AI_PAGE_PROMPTS.get(page, AI_PAGE_PROMPTS["default"])

            # Check cache first
            cache_key = hashlib.md5(f"full_ai_{page}_{prompt}".encode()).hexdigest()[:12]
            cache_path = BASE_IMAGES_DIR / f"ai_full_{cache_key}.png"

            if cache_path.exists():
                logger.info(f"Using cached full AI image: {cache_path}")
                return Image.open(cache_path)

            # Generate with Gemini 2.5 Flash Image (Nano Banana)
            logger.info(f"Generating full AI image for page: {page}")

            response = self._client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[prompt],
            )

            # Use response.parts directly (per documentation)
            logger.info(f"Response type: {type(response)}")
            logger.info(f"Has parts: {hasattr(response, 'parts')}")

            # Extract image from response using documented approach
            if hasattr(response, 'parts') and response.parts:
                for part in response.parts:
                    if part.text is not None:
                        logger.info(f"Got text response: {part.text[:100]}...")
                    elif part.inline_data is not None:
                        logger.info("Found inline_data, extracting image...")
                        try:
                            # Use as_image() method per documentation
                            img = part.as_image()
                            logger.info(f"Image extracted via as_image(): {img.size}, mode: {img.mode}")
                            img = img.resize((OG_WIDTH, OG_HEIGHT), Image.Resampling.LANCZOS)
                            # Cache it
                            img.save(cache_path, "PNG")
                            logger.info(f"Cached full AI image: {cache_path}")
                            return img
                        except AttributeError:
                            # Fallback: manually extract image data
                            logger.info("as_image() not available, using manual extraction")
                            import base64
                            inline = part.inline_data
                            raw_data = inline.data

                            if raw_data is None:
                                logger.warning("inline_data.data is None")
                                continue

                            # Handle base64-encoded data (can be bytes or str)
                            if isinstance(raw_data, bytes):
                                if raw_data[:20].startswith(b'iVBOR') or raw_data[:20].startswith(b'/9j/'):
                                    raw_data = base64.b64decode(raw_data)
                            elif isinstance(raw_data, str):
                                raw_data = base64.b64decode(raw_data)

                            logger.info(f"Data length: {len(raw_data)} bytes")

                            image_data = io.BytesIO(raw_data)
                            img = Image.open(image_data)
                            logger.info(f"Image opened: {img.size}, mode: {img.mode}")
                            img = img.resize((OG_WIDTH, OG_HEIGHT), Image.Resampling.LANCZOS)
                            img.save(cache_path, "PNG")
                            logger.info(f"Cached full AI image: {cache_path}")
                            return img

            # Fallback: Try legacy approach with candidates
            elif hasattr(response, 'candidates') and response.candidates:
                logger.info("Using candidates fallback")
                for part in response.candidates[0].content.parts:
                    # Check for text part first
                    if hasattr(part, 'text') and part.text:
                        logger.info(f"Got text part: {part.text[:200]}...")
                        continue

                    if hasattr(part, 'inline_data') and part.inline_data:
                        import base64
                        inline = part.inline_data

                        # Debug: Log mime_type and data info
                        mime_type = getattr(inline, 'mime_type', 'unknown')
                        logger.info(f"Found inline_data with mime_type: {mime_type}")

                        raw_data = inline.data

                        if raw_data is None:
                            logger.warning("inline_data.data is None")
                            continue

                        logger.info(f"Raw data type: {type(raw_data)}, length: {len(raw_data) if raw_data else 0}")

                        # Check if data is base64-encoded (even if it's bytes type)
                        # Base64 PNG starts with "iVBORw0KGgo" which is b'\x89PNG' decoded
                        if isinstance(raw_data, bytes):
                            # Check if it looks like base64 (starts with base64 chars, not binary)
                            first_bytes = raw_data[:20]
                            if first_bytes.startswith(b'iVBOR'):  # Base64-encoded PNG
                                logger.info("Data is base64-encoded PNG (as bytes), decoding...")
                                raw_data = base64.b64decode(raw_data)
                                logger.info(f"After base64 decode - length: {len(raw_data)}")
                            elif first_bytes.startswith(b'/9j/'):  # Base64-encoded JPEG
                                logger.info("Data is base64-encoded JPEG (as bytes), decoding...")
                                raw_data = base64.b64decode(raw_data)
                                logger.info(f"After base64 decode - length: {len(raw_data)}")
                            elif not first_bytes.startswith(b'\x89PNG') and not first_bytes.startswith(b'\xff\xd8'):
                                # Might be base64, try to decode
                                try:
                                    logger.info("Data doesn't look like raw image, trying base64 decode...")
                                    decoded = base64.b64decode(raw_data)
                                    if decoded.startswith(b'\x89PNG') or decoded.startswith(b'\xff\xd8'):
                                        raw_data = decoded
                                        logger.info(f"Base64 decode successful - length: {len(raw_data)}")
                                except Exception:
                                    pass
                        elif isinstance(raw_data, str):
                            logger.info("Data is string, decoding from base64...")
                            raw_data = base64.b64decode(raw_data)
                            logger.info(f"After base64 decode - length: {len(raw_data)}")

                        logger.info(f"Final data first 10 bytes (hex): {raw_data[:10].hex()}")

                        image_data = io.BytesIO(raw_data)
                        img = Image.open(image_data)
                        img = img.resize((OG_WIDTH, OG_HEIGHT), Image.Resampling.LANCZOS)
                        img.save(cache_path, "PNG")
                        logger.info(f"Cached full AI image: {cache_path}")
                        return img

            logger.warning("Gemini returned no images in response")
            return None

        except Exception as e:
            logger.error(f"Error generating full AI image: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None

    async def generate_background_with_ai(self, category: str = "default") -> Optional[Image.Image]:
        """Generate base background using Gemini 2.5 Flash Image (for text overlay mode)."""
        try:
            if not self._client:
                logger.warning("Gemini client not configured, using fallback gradient")
                return None

            prompt = BACKGROUND_PROMPTS.get(category, BACKGROUND_PROMPTS["default"])

            # Check cache first
            cache_key = hashlib.md5(f"bg_{prompt}".encode()).hexdigest()[:12]
            cache_path = BASE_IMAGES_DIR / f"bg_{cache_key}.png"

            if cache_path.exists():
                logger.info(f"Using cached background: {cache_path}")
                return Image.open(cache_path)

            # Generate with Gemini 2.5 Flash Image (Nano Banana)
            logger.info(f"Generating background for category: {category}")

            response = self._client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[prompt],
            )

            # Helper to decode image data (handles base64 in bytes or str)
            def decode_image_data(raw_data):
                import base64
                if isinstance(raw_data, bytes):
                    if raw_data[:20].startswith(b'iVBOR') or raw_data[:20].startswith(b'/9j/'):
                        return base64.b64decode(raw_data)
                    return raw_data
                elif isinstance(raw_data, str):
                    return base64.b64decode(raw_data)
                return raw_data

            # Use response.parts directly (per documentation)
            if hasattr(response, 'parts') and response.parts:
                for part in response.parts:
                    if part.inline_data is not None:
                        try:
                            img = part.as_image()
                            img = img.resize((OG_WIDTH, OG_HEIGHT), Image.Resampling.LANCZOS)
                            img.save(cache_path, "PNG")
                            logger.info(f"Cached background: {cache_path}")
                            return img
                        except AttributeError:
                            inline = part.inline_data
                            raw_data = inline.data
                            if raw_data is None:
                                continue
                            raw_data = decode_image_data(raw_data)
                            image_data = io.BytesIO(raw_data)
                            img = Image.open(image_data)
                            img = img.resize((OG_WIDTH, OG_HEIGHT), Image.Resampling.LANCZOS)
                            img.save(cache_path, "PNG")
                            logger.info(f"Cached background: {cache_path}")
                            return img

            # Fallback: candidates approach
            if hasattr(response, 'candidates') and response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        raw_data = part.inline_data.data
                        if raw_data is None:
                            continue
                        raw_data = decode_image_data(raw_data)
                        image_data = io.BytesIO(raw_data)
                        img = Image.open(image_data)
                        img = img.resize((OG_WIDTH, OG_HEIGHT), Image.Resampling.LANCZOS)
                        img.save(cache_path, "PNG")
                        logger.info(f"Cached background: {cache_path}")
                        return img

            logger.warning("Gemini returned no images, using fallback gradient")
            return None

        except Exception as e:
            logger.error(f"Error generating background: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None

    def _wrap_text(self, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
        """Wrap text to fit within max_width."""
        words = text.split()
        lines = []
        current_line = []

        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = font.getbbox(test_line)
            width = bbox[2] - bbox[0]

            if width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]

        if current_line:
            lines.append(' '.join(current_line))

        return lines

    def _draw_text_with_shadow(
        self,
        draw: ImageDraw.ImageDraw,
        position: tuple[int, int],
        text: str,
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int],
        shadow_offset: int = 2
    ):
        """Draw text with a subtle shadow for better readability."""
        x, y = position
        # Shadow
        draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=(0, 0, 0, 128))
        # Main text
        draw.text((x, y), text, font=font, fill=fill)

    async def generate_og_image(
        self,
        title: str,
        subtitle: Optional[str] = None,
        category: Optional[str] = None,
        badge: Optional[str] = None,
        use_imagen_base: bool = False
    ) -> bytes:
        """
        Generate an OG image with the given text.

        Args:
            title: Main title text
            subtitle: Optional subtitle/description
            category: Category for base image style (breaking, politics, tech, default)
            badge: Optional badge text (e.g., "BREAKING", "VERIFIED")
            use_imagen_base: Whether to use Gemini for base background

        Returns:
            PNG image bytes
        """
        # Check cache first
        cache_key = hashlib.md5(f"{title}_{subtitle}_{category}_{badge}".encode()).hexdigest()[:16]
        cache_path = CACHE_DIR / f"og_{cache_key}.png"

        if cache_path.exists():
            with open(cache_path, "rb") as f:
                return f.read()

        # Get or create base image
        base_img = None
        if use_imagen_base:
            base_img = await self.generate_background_with_ai(category or "default")

        if base_img is None:
            base_img = self._create_gradient_background()

        # Convert to RGBA for compositing
        img = base_img.convert('RGBA')
        draw = ImageDraw.Draw(img)

        # Add semi-transparent overlay for better text readability
        overlay = Image.new('RGBA', (OG_WIDTH, OG_HEIGHT), (0, 0, 0, 100))
        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)

        # Padding
        padding = 60
        content_width = OG_WIDTH - (padding * 2)

        y_position = padding + 40

        # Draw badge if provided
        if badge:
            badge_font = self._get_font(20, bold=True)
            badge_bbox = badge_font.getbbox(badge)
            badge_width = badge_bbox[2] - badge_bbox[0] + 24
            badge_height = badge_bbox[3] - badge_bbox[1] + 12

            # Badge background
            badge_color = BRAND_COLORS["green"] if badge == "VERIFICADO" else BRAND_COLORS["primary"]
            draw.rounded_rectangle(
                [padding, y_position, padding + badge_width, y_position + badge_height],
                radius=6,
                fill=(*badge_color, 230)
            )
            draw.text((padding + 12, y_position + 4), badge, font=badge_font, fill=BRAND_COLORS["white"])
            y_position += badge_height + 20

        # Draw logo/brand
        brand_font = self._get_font(32, bold=True)
        draw.text((padding, y_position), "LatBot", font=brand_font, fill=BRAND_COLORS["white"])
        # Get width of "LatBot"
        latbot_bbox = brand_font.getbbox("LatBot")
        latbot_width = latbot_bbox[2] - latbot_bbox[0]
        draw.text((padding + latbot_width, y_position), ".news", font=brand_font, fill=BRAND_COLORS["primary"])
        y_position += 60

        # Draw title
        title_font = self._get_font(52, bold=True)
        title_lines = self._wrap_text(title, title_font, content_width)

        for line in title_lines[:3]:  # Max 3 lines
            self._draw_text_with_shadow(draw, (padding, y_position), line, title_font, BRAND_COLORS["white"])
            y_position += 62

        y_position += 10

        # Draw subtitle if provided
        if subtitle:
            subtitle_font = self._get_font(28)
            subtitle_lines = self._wrap_text(subtitle, subtitle_font, content_width)

            for line in subtitle_lines[:2]:  # Max 2 lines
                draw.text((padding, y_position), line, font=subtitle_font, fill=BRAND_COLORS["gray"])
                y_position += 36

        # Draw bottom accent line
        draw.rectangle(
            [0, OG_HEIGHT - 8, OG_WIDTH, OG_HEIGHT],
            fill=BRAND_COLORS["primary"]
        )

        # Draw category indicator on right
        if category:
            cat_font = self._get_font(18)
            cat_text = category.upper()
            cat_bbox = cat_font.getbbox(cat_text)
            cat_width = cat_bbox[2] - cat_bbox[0]
            draw.text(
                (OG_WIDTH - padding - cat_width, OG_HEIGHT - 50),
                cat_text,
                font=cat_font,
                fill=BRAND_COLORS["gray"]
            )

        # Convert to RGB and save
        final_img = img.convert('RGB')

        # Save to cache
        final_img.save(cache_path, "PNG", optimize=True)

        # Return bytes
        buffer = io.BytesIO()
        final_img.save(buffer, "PNG", optimize=True)
        return buffer.getvalue()

    async def generate_ai_og_image(self, page: str = "default") -> bytes:
        """
        Generate a 100% AI-created OG image for a specific page.
        No text overlay - everything is generated by AI.

        Args:
            page: Page identifier (home, facts, sources, entities, article, default)

        Returns:
            PNG image bytes
        """
        # Check cache first
        cache_key = hashlib.md5(f"ai_og_{page}".encode()).hexdigest()[:16]
        cache_path = CACHE_DIR / f"ai_og_{cache_key}.png"

        if cache_path.exists():
            with open(cache_path, "rb") as f:
                return f.read()

        # Generate full AI image
        img = await self.generate_full_ai_image(page)

        if img is None:
            # Fallback to gradient with simple branding
            img = self._create_gradient_background()
            draw = ImageDraw.Draw(img)
            brand_font = self._get_font(48, bold=True)
            draw.text((60, 280), "LatBot", font=brand_font, fill=BRAND_COLORS["white"])
            latbot_bbox = brand_font.getbbox("LatBot")
            latbot_width = latbot_bbox[2] - latbot_bbox[0]
            draw.text((60 + latbot_width, 280), ".news", font=brand_font, fill=BRAND_COLORS["primary"])

        # Convert and save
        final_img = img.convert('RGB') if img.mode != 'RGB' else img

        # Save to cache
        final_img.save(cache_path, "PNG", optimize=True)

        # Return bytes
        buffer = io.BytesIO()
        final_img.save(buffer, "PNG", optimize=True)
        return buffer.getvalue()

    def clear_cache(self):
        """Clear the OG image cache."""
        for f in CACHE_DIR.glob("og_*.png"):
            f.unlink()
        for f in BASE_IMAGES_DIR.glob("*.png"):
            f.unlink()
        logger.info("OG image cache cleared")


# Global instance
og_generator = OGImageGenerator()
