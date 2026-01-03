from datetime import datetime
from typing import Optional


def format_relative_time(dt: Optional[datetime]) -> str:
    """Formatea una fecha como tiempo relativo en español."""
    if not dt:
        return "Fecha desconocida"

    now = datetime.utcnow()
    diff = now - dt

    seconds = diff.total_seconds()

    if seconds < 60:
        return "Hace un momento"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"Hace {minutes} {'minuto' if minutes == 1 else 'minutos'}"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"Hace {hours} {'hora' if hours == 1 else 'horas'}"
    elif seconds < 604800:
        days = int(seconds / 86400)
        return f"Hace {days} {'día' if days == 1 else 'días'}"
    else:
        return dt.strftime("%d de %B de %Y")


def truncate_text(text: str, max_length: int = 200) -> str:
    """Trunca texto a una longitud máxima."""
    if not text or len(text) <= max_length:
        return text
    return text[:max_length].rsplit(" ", 1)[0] + "..."


def clean_html(text: str) -> str:
    """Limpia tags HTML básicos de un texto."""
    import re
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)
