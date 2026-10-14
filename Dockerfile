# 1) Constrói o site (React)
FROM node:22-alpine AS site
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Constrói o servidor (Spring Boot) com o site dentro, e o motor do jogo
FROM eclipse-temurin:21-jdk AS servidor
WORKDIR /app
COPY . .
COPY --from=site /app/frontend/dist frontend/dist
RUN ./gradlew :servidor:bootJar :motor:sandboxLibs --no-daemon

# 3) Imagem final. Precisa de JDK (não só JRE), porque o servidor compila o código dos alunos.
FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY --from=servidor /app/servidor/build/libs/servidor.jar app.jar
COPY --from=servidor /app/motor/build/sandbox-libs sandbox-libs
ENV JAVAQUEST_SANDBOX_LIBS=/app/sandbox-libs
RUN useradd --create-home aluno
USER aluno
EXPOSE 8080
CMD ["java", "-XX:MaxRAMPercentage=60", "-jar", "app.jar"]
