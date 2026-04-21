"""Сервис отправки email через SMTP (async-safe, fire-and-forget friendly)."""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import partial

from app.config import settings

logger = logging.getLogger(__name__)


def _build_message(to_email: str, subject: str, html_body: str, text_body: str) -> MIMEMultipart:
    """Собирает MIME-сообщение."""
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def _send_email_sync(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Синхронная отправка email через SMTP."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP не настроен — email не отправлен (to=%s, subject=%s)", to_email, subject)
        return False

    msg = _build_message(to_email, subject, html_body, text_body)
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email отправлен: to=%s subject=%s", to_email, subject)
        return True
    except Exception:
        logger.exception("Ошибка отправки email: to=%s", to_email)
        return False


async def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Асинхронная отправка email (не блокирует event loop)."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, partial(_send_email_sync, to_email, subject, html_body, text_body)
    )


# ─── Стили ──────────────────────────────────────────────────────────────────
# Editorial-dark с cream-акцентом — соответствует бренду dicto.pro.
# Inline-стили, потому что в письмах нельзя <style> надёжно.
_BG = "#0b0805"
_BG_ELEV = "#141009"
_FG = "#f7f3ec"
_FG_MUTED = "#c9bba4"
_FG_SUBTLE = "#968b74"
_ACCENT = "#c5f014"
_ACCENT_FG = "#0b0805"
_BORDER = "rgba(247,243,236,0.12)"


def _wrap_html(content: str, preheader: str = "") -> str:
    """Каркас: hero-card на ink-фоне, editorial-serif заголовок, footer."""
    return f"""
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:{_BG};font-family:'Helvetica Neue',Inter,-apple-system,sans-serif;color:{_FG};">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{preheader}</span>
    <div style="background:{_BG};padding:32px 16px;">
        <div style="max-width:540px;margin:0 auto;background:{_BG_ELEV};border:1px solid {_BORDER};border-radius:24px;overflow:hidden;">
            <div style="padding:28px 32px;border-bottom:1px solid {_BORDER};">
                <span style="display:inline-flex;align-items:center;gap:8px;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{_ACCENT};"></span>
                    <span style="font-family:Georgia,'Instrument Serif',serif;font-size:24px;color:{_FG};letter-spacing:-0.5px;">Dicto</span>
                </span>
            </div>
            <div style="padding:36px 32px;">
                {content}
            </div>
            <div style="padding:20px 32px;border-top:1px solid {_BORDER};">
                <p style="margin:0;font-size:11px;color:{_FG_SUBTLE};text-transform:uppercase;letter-spacing:2px;">
                    Dicto · транскрибация с AI-инсайтами · dicto.pro
                </p>
            </div>
        </div>
        <p style="text-align:center;margin:20px auto 0;max-width:540px;font-size:11px;color:{_FG_SUBTLE};">
            Это автоматическое письмо от сервиса Dicto. Если вы его не ожидали, просто проигнорируйте.
        </p>
    </div>
</body>
</html>
    """


def _btn(href: str, label: str) -> str:
    return (
        f'<a href="{href}" style="display:inline-block;background:{_ACCENT};color:{_ACCENT_FG};'
        f'padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;'
        f'font-size:14px;letter-spacing:-0.01em;">{label}</a>'
    )


def _h(text: str) -> str:
    return (
        f'<h1 style="font-family:Georgia,\'Instrument Serif\',serif;font-size:32px;line-height:1.1;'
        f'letter-spacing:-0.5px;color:{_FG};margin:0 0 16px;font-weight:400;">{text}</h1>'
    )


def _p(text: str) -> str:
    return f'<p style="font-size:15px;line-height:1.55;color:{_FG_MUTED};margin:0 0 16px;">{text}</p>'


def _mono(text: str) -> str:
    return (
        f'<p style="font-family:\'JetBrains Mono\',\'SF Mono\',monospace;font-size:11px;'
        f'color:{_FG_SUBTLE};text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">{text}</p>'
    )


# ─── Шаблоны ────────────────────────────────────────────────────────────────

async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Письмо со ссылкой для сброса пароля."""
    reset_url = f"{settings.APP_URL}/reset-password?token={reset_token}&email={to_email}"
    subject = "Сброс пароля — Dicto"
    content = (
        _mono("Восстановление доступа")
        + _h("Сбросьте пароль")
        + _p(
            "Вы запросили сброс пароля для аккаунта Dicto. Нажмите кнопку ниже, чтобы задать новый — "
            f"ссылка действительна {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} минут."
        )
        + f'<p style="margin:28px 0;">{_btn(reset_url, "Сбросить пароль →")}</p>'
        + _p(
            f'<span style="color:{_FG_SUBTLE};">Если вы не запрашивали сброс — просто проигнорируйте это письмо. '
            "Ваш аккаунт останется в безопасности.</span>"
        )
    )
    text = (
        f"Сброс пароля Dicto\n\n"
        f"Перейдите по ссылке: {reset_url}\n\n"
        f"Ссылка действительна {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} минут.\n"
        f"Если вы не запрашивали сброс — проигнорируйте это письмо."
    )
    return await send_email(to_email, subject, _wrap_html(content, "Ссылка для сброса пароля"), text)


async def send_welcome_email(to_email: str, name: str) -> bool:
    """Приветственное письмо после регистрации."""
    greeting = f"Привет, {name}" if name else "Добро пожаловать"
    subject = "180 минут ждут вас — Dicto"
    content = (
        _mono("Добро пожаловать в Dicto")
        + _h(f"{greeting}.")
        + _p(
            "Вы зарегистрировались в Dicto — сервисе транскрибации аудио и видео с AI-инсайтами. "
            "На счёте уже <strong>180 минут бонуса</strong> — этого хватит чтобы протестировать продукт "
            "на реальных записях без карты и подписки."
        )
        + _p(
            "Что можно сделать прямо сейчас:"
        )
        + (
            f'<ul style="margin:0 0 20px;padding:0 0 0 18px;color:{_FG_MUTED};font-size:15px;line-height:1.8;">'
            '<li>Загрузить запись совещания или интервью</li>'
            '<li>Получить текст с таймкодами и разметкой спикеров</li>'
            '<li>Прочитать AI-саммари и action items за 30 секунд</li>'
            '<li>Задать вопрос транскрипту через RAG-чат</li>'
            '</ul>'
        )
        + f'<p style="margin:28px 0;">{_btn(settings.APP_URL + "/upload", "Загрузить первый файл →")}</p>'
        + _p(
            f'<span style="color:{_FG_SUBTLE};">Техническая поддержка и вопросы: '
            f'<a href="mailto:support@dicto.pro" style="color:{_FG};text-decoration:underline;text-decoration-color:{_BORDER};">support@dicto.pro</a>'
            "</span>"
        )
    )
    text = (
        f"{greeting}.\n\n"
        "Вы зарегистрировались в Dicto — на счёте 180 бонусных минут транскрибации.\n\n"
        "Что сделать прямо сейчас:\n"
        "- Загрузить запись (MP3, WAV, MP4, OGG и ещё 8 форматов)\n"
        "- Получить текст с таймкодами и спикерами\n"
        "- Прочитать AI-саммари и action items\n"
        "- Задать вопрос транскрипту через RAG-чат\n\n"
        f"Начать: {settings.APP_URL}/upload\n\n"
        "Поддержка: support@dicto.pro"
    )
    return await send_email(to_email, subject, _wrap_html(content, "180 бонусных минут на счёте"), text)


async def send_subscription_email(to_email: str, plan: str) -> bool:
    """Уведомление об активации подписки."""
    plan_names = {
        "start": "Старт — 500 ₽/мес · 10 часов",
        "pro": "Про — 820 ₽/мес · 25 часов",
        "business": "Бизнес — 2 300 ₽/мес · 60 часов",
        "premium": "Премиум — 4 600 ₽/мес · 120 часов",
    }
    plan_display = plan_names.get(plan, plan)
    subject = f"Подписка активирована — {plan_display}"
    content = (
        _mono(f"Тариф {plan}")
        + _h("Подписка активна.")
        + _p(
            f"Ваш тариф <strong>{plan_display}</strong> успешно активирован. "
            "Все функции тарифа доступны в кабинете, новые минуты обновляются ежемесячно."
        )
        + f'<p style="margin:28px 0;">{_btn(settings.APP_URL + "/dashboard", "Перейти в кабинет →")}</p>'
        + _p(
            f'<span style="color:{_FG_SUBTLE};">Платёжные документы приходят отдельным письмом от ЮKassa. '
            f'Управление подпиской: <a href="{settings.APP_URL}/subscription" style="color:{_FG};text-decoration:underline;text-decoration-color:{_BORDER};">{settings.APP_URL}/subscription</a>'
            "</span>"
        )
    )
    text = (
        f"Подписка активирована — {plan_display}\n\n"
        f"Перейти в кабинет: {settings.APP_URL}/dashboard\n"
        f"Управление подпиской: {settings.APP_URL}/subscription\n\n"
        "Поддержка: support@dicto.pro"
    )
    return await send_email(to_email, subject, _wrap_html(content, "Подписка активирована"), text)
