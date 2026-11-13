plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Release signing comes from CI secrets (project properties keystoreFile,
// keystorePassword, keyAlias, keyPassword). If they are absent the release
// build type simply has no signing config and only assembleDebug is built.
val keystoreFileProp = project.findProperty("keystoreFile") as String?
val keystorePasswordProp = project.findProperty("keystorePassword") as String?
val keyAliasProp = project.findProperty("keyAlias") as String?
val keyPasswordProp = project.findProperty("keyPassword") as String?
val hasReleaseKeystore = keystoreFileProp != null && file(keystoreFileProp).exists()

android {
    namespace = "com.jiebao.wmsapp"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.jiebao.wmsapp"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    if (hasReleaseKeystore) {
        signingConfigs {
            create("release") {
                storeFile = file(keystoreFileProp!!)
                storePassword = keystorePasswordProp
                keyAlias = keyAliasProp
                keyPassword = keyPasswordProp
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            // debug signing is automatic; fine for PDA sideload testing
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
}
