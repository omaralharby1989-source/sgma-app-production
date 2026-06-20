// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
// Plugin sources are vendored into ../Vendors/ so Xcode can Archive without running pnpm/npm.
// GoogleMobileAds, UMP and Capacitor framework are resolved from GitHub automatically by Xcode SPM.
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.0"),
        .package(name: "CapacitorCommunityAdmob", path: "../Vendors/admob"),
        .package(name: "CapacitorSplashScreen", path: "../Vendors/splash-screen")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunityAdmob", package: "CapacitorCommunityAdmob"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen")
            ]
        )
    ]
)
