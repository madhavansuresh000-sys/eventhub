# EventHub backend as a Docker image (Phase 9: used by Render).
# Stage 1 builds the JAR with the Maven wrapper; stage 2 only contains Java + the JAR (smaller, no source code).

FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
# dependencies first: this layer is cached as long as pom.xml does not change
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
# the tests already ran in GitHub Actions (they need Docker for MySQL, which a build machine does not have)
RUN ./mvnw -q -B package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --no-create-home eventhub
COPY --from=build /app/target/*.jar app.jar
USER eventhub
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
