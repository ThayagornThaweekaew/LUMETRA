use axum::{
    routing::get,
    Json, Router,
};
use serde::Serialize;
use tokio::net::TcpListener;
use tower_http::cors::{CorsLayer, Any};

#[derive(Serialize)]
struct WeeklyUser {
    day: String,
    users: u32,
}

#[derive(Serialize)]
struct KPIResponse {
    total_users: u32,
    active_sessions: u32,
    accuracy: f32,
    latency_ms: u32,
}

async fn get_kpi() -> Json<KPIResponse> {
    Json(KPIResponse {
        total_users: 1200,
        active_sessions: 340,
        accuracy: 92.0,
        latency_ms: 120,
    })
}

async fn weekly_users() -> Json<Vec<WeeklyUser>> {
    Json(vec![
        WeeklyUser { day: "Mon".into(), users: 120 },
        WeeklyUser { day: "Tue".into(), users: 210 },
        WeeklyUser { day: "Wed".into(), users: 180 },
        WeeklyUser { day: "Thu".into(), users: 260 },
        WeeklyUser { day: "Fri".into(), users: 300 },
        WeeklyUser { day: "Sat".into(), users: 220 },
        WeeklyUser { day: "Sun".into(), users: 190 },
    ])
}

#[tokio::main]
async fn main() {
    // ✅ CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/kpi", get(get_kpi))
        .route("/api/weekly-users", get(weekly_users)) // ✅ เพิ่มตรงนี้
        .layer(cors);

    let listener = TcpListener::bind("127.0.0.1:8080")
        .await
        .unwrap();

    println!("🚀 Backend running at http://127.0.0.1:8080");

    axum::serve(listener, app)
        .await
        .unwrap();
}
