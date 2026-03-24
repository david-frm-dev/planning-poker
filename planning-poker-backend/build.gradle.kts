plugins {
	kotlin("jvm") version "2.3.0"
	kotlin("plugin.spring") version "2.3.0"
	id("org.springframework.boot") version "4.0.3"
	id("io.spring.dependency-management") version "1.1.7"
	id("org.openapi.generator") version "7.11.0"
}

group = "network.fuhrmann"
version = "0.0.1-SNAPSHOT"
description = "backend for planning-poker app"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(25)
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
}

dependencies {
	// OpenAPI/Swagger
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.9")
	implementation("org.springdoc:springdoc-openapi-starter-webflux-ui:2.8.9")

	// implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webflux")
	implementation("io.projectreactor.kotlin:reactor-kotlin-extensions")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")
	implementation("tools.jackson.module:jackson-module-kotlin")

	developmentOnly("org.springframework.boot:spring-boot-devtools")
	annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
	// testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webflux-test")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

val generatedSourcesDir = layout.buildDirectory.dir("generated/openapi/src/main/kotlin")

openApiGenerate {
	generatorName.set("kotlin-spring")
	inputSpec.set("${projectDir}/src/main/resources/openapi.yaml")
	outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.path)
	apiPackage.set("network.fuhrmann.planning_poker.generated.api")
	modelPackage.set("network.fuhrmann.planning_poker.generated.model")
	globalProperties.set(mapOf(
		"models" to "",
		"apis" to ""
	))
	configOptions.set(mapOf(
		"interfaceOnly" to "true",
		"reactive" to "true",
		"useSpringBoot3" to "true",
		"documentationProvider" to "none",
		"useTags" to "true",
		"useDelegatePattern" to "false",
		"serializationLibrary" to "jackson"
	))
}

kotlin {
	sourceSets {
		main {
			kotlin.srcDir(generatedSourcesDir)
		}
	}
	compilerOptions {
		freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
	}
    jvmToolchain(25)
}

tasks.compileKotlin {
	dependsOn(tasks.openApiGenerate)
}

tasks.withType<Test> {
	useJUnitPlatform()
}

val buildFrontend by tasks.registering(Exec::class) {
	group = "build"
	workingDir = file("../planning-poker")

	val isWindows = org.apache.tools.ant.taskdefs.condition.Os
		.isFamily(org.apache.tools.ant.taskdefs.condition.Os.FAMILY_WINDOWS)

	val npmExecutable = if (isWindows) {
		"npm.cmd"
	} else {
		findProperty("npmPath") as String?
			?: error("npmPath ist nicht in gradle.properties gesetzt!")
	}

	commandLine(npmExecutable, "run", "build")
}

val copyFrontend by tasks.registering(Copy::class) {
    group = "build"
    dependsOn(buildFrontend)
    from("../planning-poker/dist/apps/webapp/browser")
    into(layout.projectDirectory.dir("src/main/resources/public"))
}

tasks.processResources {
    dependsOn(copyFrontend)
}
