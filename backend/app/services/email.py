"""Сервис отправки email через SMTP."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Отправляет email через SMTP. Возвращает True при успехе."""
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


# --- Шаблоны писем ---

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Письмо со ссылкой для сброса пароля."""
    reset_url = f"{settings.APP_URL}/reset-password?token={reset_token}&email={to_email}"
    subject = "Сброс пароля — AI Voice"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Сброс пароля</h2>
        <p style="color: #555; line-height: 1.6;">
            Вы запросили сброс пароля для аккаунта AI Voice. Нажмите кнопку ниже, чтобы установить новый пароль:
        </p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}"
               style="background: #4c6ef5; color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">
                Сбросить пароль
            </a>
        </p>
        <p style="color: #999; font-size: 13px; line-height: 1.5;">
            Ссылка действительна {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} минут.<br>
            Если вы не запрашивали сброс — просто проигнорируйте это письмо.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #bbb; font-size: 12px;">AI Voice — сервис транскрибации аудио и видео</p>
    </div>
    """
    text = f"Сброс пароля AI Voice\n\nПерейдите по ссылке: {reset_url}\n\nСсылка действительна {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} минут."
    return send_email(to_email, subject, html, text)


def send_welcome_email(to_email: str, name: str) -> bool:
    """Приветственное письмо после регистрации."""
    subject = "Добро пожаловать в AI Voice!"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Добро пожаловать{', ' + name if name else ''}!</h2>
        <p style="color: #555; line-height: 1.6;">
            Вы зарегистрировались в AI Voice — сервисе транскрибации аудио и видео в текст с помощью нейросетей.
        </p>
        <p style="color: #555; line-height: 1.6;">Что доступно на бесплатном тарифе:</p>
        <ul style="color: #555; line-height: 1.8;">
            <li>15 минут транскрибации в месяц</li>
            <li>3 AI-саммари</li>
            <li>Экспорт в TXT</li>
        </ul>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{settings.APP_URL}/upload"
               style="background: #4c6ef5; color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">
                Загрузить первый файл
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #bbb; font-size: 12px;">AI Voice — сервис транскрибации аудио и видео</p>
    </div>
    """
    text = f"Добро пожаловать в AI Voice{', ' + name if name else ''}!\n\n15 мин бесплатной транскрибации в месяц.\n\nЗагрузите файл: {settings.APP_URL}/upload"
    return send_email(to_email, subject, html, text)


def send_subscription_email(to_email: str, plan: str) -> bool:
    """Уведомление об активации подписки."""
    plan_names = {"start": "Старт (290 ₽/мес)", "pro": "Про (590 ₽/мес)"}
    plan_name = plan_names.get(plan, plan)
    subject = f"Подписка {plan_name} активирована — AI Voice"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Подписка активирована!</h2>
        <p style="color: #555; line-height: 1.6;">
            Ваш тариф <strong>{plan_name}</strong> успешно активирован. Теперь вам доступны все возможности тарифа.
        </p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{settings.APP_URL}/dashboard"
               style="background: #4c6ef5; color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-block;">
                Перейти в кабинет
            </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #bbb; font-size: 12px;">AI Voice — сервис транскрибации аудио и видео</p>
    </div>
    """
    text = f"Подписка {plan_name} активирована!\n\nПерейти в кабинет: {settings.APP_URL}/dashboard"
    return send_email(to_email, subject, html, text)
