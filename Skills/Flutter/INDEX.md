# Flutter Skill Library — Index

> Auto-generated index of all Flutter skills. Each skill lives in its own subdirectory containing a `SKILL.md` with full instructions, workflows, and code examples.

| # | Skill | Directory | Description |
|---|-------|-----------|-------------|
| 1 | **Add Integration Test** | `flutter-add-integration-test/` | Configures Flutter Driver and the `integration_test` package for end-to-end app interaction tests. Covers MCP-based interactive exploration, `WidgetTester` authoring, `flutter drive` execution, and performance profiling on Chrome/Android/Firebase Test Lab. |
| 2 | **Add Widget Preview** | `flutter-add-widget-preview/` | Adds interactive widget previews using the `previews.dart` system (`@Preview` annotations). Covers custom annotations, `MultiPreview`, runtime transformations, IDE and CLI workflows, and web-environment limitations (no native APIs). |
| 3 | **Add Widget Test** | `flutter-add-widget-test/` | Implements component-level tests with `WidgetTester`, `Finder`, and `Matcher`. Covers static rendering, tap/drag/input interactions, animation settle, scroll-until-visible, and the full test-authoring workflow. |
| 4 | **Apply Architecture Best Practices** | `flutter-apply-architecture-best-practices/` | Architects a Flutter app using the recommended layered approach (UI → ViewModel → Repository → Service). Covers MVVM with `ChangeNotifier`, the Repository pattern, optional Domain/Use-Case layer, dependency injection, and a feature-by-feature project structure. |
| 5 | **Build Responsive Layout** | `flutter-build-responsive-layout/` | Creates adaptive layouts using `LayoutBuilder`, `MediaQuery`, `Expanded`/`Flexible`, and `ConstrainedBox`. Covers breakpoint-based switching, large-screen optimization (grid delegation, max-width constraints), and guidance on orientation and multi-input support. |
| 6 | **Fix Layout Issues** | `flutter-fix-layout-issues/` | Diagnoses and resolves Flutter layout constraint errors: "RenderFlex overflowed", "Vertical viewport was given unbounded height", "InputDecorator unbounded width", "Incorrect use of ParentData widget", and cascading "RenderBox was not laid out". Provides conditional fixes for each error type. |
| 7 | **Implement JSON Serialization** | `flutter-implement-json-serialization/` | Creates model classes with manual `fromJson`/`toJson` using `dart:convert`. Covers synchronous parsing, background parsing via `compute()`, type-safe pattern matching, and HTTP response validation. |
| 8 | **Setup Declarative Routing** | `flutter-setup-declarative-routing/` | Configures `MaterialApp.router` with `go_router` for URL-based navigation. Covers route trees, `GoRoute` with path parameters, `StatefulShellRoute` for persistent bottom-nav shells, Android/iOS deep linking setup, and programmatic navigation (`go`, `push`, `goNamed`). |
| 9 | **Setup Localization** | `flutter-setup-localization/` | Initializes `flutter_localizations` and `intl` with ARB-based code generation. Covers `l10n.yaml` config, `MaterialApp` delegate wiring, placeholder/plural/select string formatting, and the generate-and-consume workflow. |
| 10 | **Use HTTP Package** | `flutter-use-http-package/` | Implements REST API networking with the `http` package. Covers GET/POST/PUT/DELETE, headers and auth, JSON encoding/decoding, background parsing via `compute()`, platform permissions (Android/macos), and `FutureBuilder` UI integration. |

## Quick Lookup by Task

| Task | Skill |
|------|-------|
| Write an end-to-end test for a user flow | **Add Integration Test** |
| Preview a widget in isolation during development | **Add Widget Preview** |
| Unit-test a single widget's rendering and interactions | **Add Widget Test** |
| Structure a new Flutter project or refactor for scale | **Apply Architecture Best Practices** |
| Make a screen adapt to phone, tablet, and desktop | **Build Responsive Layout** |
| Fix a yellow/black overflow or unbounded constraint error | **Fix Layout Issues** |
| Parse JSON from an API into Dart model classes | **Implement JSON Serialization** |
| Add deep linking, nested navigation, or URL-based routing | **Setup Declarative Routing** |
| Add multi-language support (i18n/l10n) | **Setup Localization** |
| Call a REST API from a Flutter app | **Use HTTP Package** |
