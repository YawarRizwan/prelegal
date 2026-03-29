# Stage 1: Build Next.js frontend (static export)
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: FastAPI backend serving the static frontend
FROM python:3.11-slim AS runtime
WORKDIR /app

# Install uv
RUN pip install uv --no-cache-dir

# Install Python dependencies
COPY backend/pyproject.toml ./pyproject.toml
RUN uv pip install --system fastapi "uvicorn[standard]" aiofiles litellm python-dotenv

# Copy backend source
COPY backend/app ./app

# Copy static frontend build
COPY --from=frontend-build /frontend/out ./static

ENV STATIC_DIR=/app/static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
