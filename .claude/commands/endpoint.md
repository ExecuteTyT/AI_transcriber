Создай новый FastAPI эндпоинт: $ARGUMENTS

Порядок:
1. Прочитай CLAUDE.md — секцию "API эндпоинты" и "Правила кода"
2. Создай роут в backend/app/api/ (используй FastAPI Router с тегами)
3. Создай Pydantic-схемы для request и response в backend/app/schemas/
4. Создай или обнови сервис в backend/app/services/
5. Напиши тесты в backend/tests/ (pytest + httpx AsyncClient)
6. Запусти pytest, убедись что всё проходит
7. Проверь что Swagger (/docs) отображает новый эндпоинт корректно
