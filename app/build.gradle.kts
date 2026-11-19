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
        versionCode = 3
        versionName = "1.1.1-native"
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
    // Native WMS transport: OkHttp WebSocket (wss://wms.pantum.com:443/wm_webrf).
    // OkHttp 4.12.0 supports minSdk 21.
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    // Modern TLS for old Android (6.0, 32-bit): the platform TLS stack on
    // API 23 cannot complete the handshake with this server, while the
    // WebView (Chromium/BoringSSL) can. Conscrypt gives OkHttp a current
    // TLS 1.2/1.3 stack with its own trust store. Supports armeabi-v7a.
    implementation("org.conscrypt:conscrypt-android:2.5.2")
}
