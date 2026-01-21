use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use mongodb::{
    bson::{doc, oid::ObjectId, Bson},
    options::{ClientOptions, UpdateOptions},
    Client, Collection,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

// --------------------
// Helpers
// --------------------
fn bson_now() -> mongodb::bson::DateTime {
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time went backwards")
        .as_millis() as i64;
    mongodb::bson::DateTime::from_millis(ms)
}

// --------------------
// Demo API models
// --------------------
#[derive(Serialize)]
struct WeeklyUser {
    day: String,
    users: u32,
}

#[derive(Serialize)]
struct KPIResponse {
    total_users: u32,
    active_sessions: u32,
    accuracy: u32,
    latency_ms: u32,
}

// --------------------
// MongoDB layout models
// --------------------
#[derive(Debug, Serialize, Deserialize)]
struct DashboardLayoutDoc {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<ObjectId>,

    dashboard_id: String,
    widgets: Value,
    layouts: Value,

    // ✅ ทำเป็น Option เพื่อไม่พังกับเอกสารเก่าที่ไม่มี created_at / updated_at
    created_at: Option<mongodb::bson::DateTime>,
    updated_at: Option<mongodb::bson::DateTime>,
}

#[derive(Clone)]
struct AppState {
    layout_col: Collection<DashboardLayoutDoc>,
}

// --------------------
// Handlers (Demo APIs)
// --------------------
async fn get_kpi() -> Json<KPIResponse> {
    Json(KPIResponse {
        total_users: 1200,
        active_sessions: 340,
        accuracy: 92,
        latency_ms: 120,
    })
}

#[derive(Deserialize)]
struct WeeklyUsersQuery {
    range: Option<String>, // รับไว้ก่อน (อนาคตค่อยใช้)
}

async fn weekly_users(Query(_q): Query<WeeklyUsersQuery>) -> Json<Vec<WeeklyUser>> {
    let data = vec![
        WeeklyUser { day: "Mon".into(), users: 120 },
        WeeklyUser { day: "Tue".into(), users: 210 },
        WeeklyUser { day: "Wed".into(), users: 180 },
        WeeklyUser { day: "Thu".into(), users: 260 },
        WeeklyUser { day: "Fri".into(), users: 280 },
        WeeklyUser { day: "Sat".into(), users: 220 },
        WeeklyUser { day: "Sun".into(), users: 200 },
    ];
    Json(data)
}

// --------------------
// Handlers (Mongo Layout)
// --------------------
async fn get_layout(
    Path(dashboard_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<Value>, StatusCode> {
    let filter = doc! { "dashboard_id": &dashboard_id };

    let found = state
        .layout_col
        .find_one(filter)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match found {
        Some(doc) => Ok(Json(json!({
            "dashboard_id": doc.dashboard_id,
            "widgets": doc.widgets,
            "layouts": doc.layouts
        }))),
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[derive(Deserialize)]
struct SaveLayoutReq {
    widgets: Value,
    layouts: Value,
}

async fn put_layout(
    Path(dashboard_id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<SaveLayoutReq>,
) -> Result<StatusCode, StatusCode> {
    let now_bson = bson_now();
    let filter = doc! { "dashboard_id": &dashboard_id };

    let widgets_bson =
        mongodb::bson::to_bson(&payload.widgets).map_err(|_| StatusCode::BAD_REQUEST)?;
    let layouts_bson =
        mongodb::bson::to_bson(&payload.layouts).map_err(|_| StatusCode::BAD_REQUEST)?;

    let update = doc! {
        "$set": {
            "widgets": widgets_bson,
            "layouts": layouts_bson,
            "updated_at": Bson::DateTime(now_bson),
        },
        "$setOnInsert": {
            "dashboard_id": &dashboard_id,
            "created_at": Bson::DateTime(now_bson),
        }
    };

    let opts = UpdateOptions::builder().upsert(true).build();

    state
        .layout_col
        .update_one(filter, update)
        .with_options(opts)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // ✅ one-time migration: เติม created_at ให้เอกสารเก่าที่ไม่มี field นี้
    let _ = state
        .layout_col
        .update_one(
            doc! { "dashboard_id": &dashboard_id, "created_at": { "$exists": false } },
            doc! { "$set": { "created_at": Bson::DateTime(now_bson) } },
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

// --------------------
// Main
// --------------------
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let mongo_uri = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());

    let db_name = std::env::var("MONGODB_DB").unwrap_or_else(|_| "LUMETRA".to_string());

    let mut client_options = ClientOptions::parse(&mongo_uri).await?;
    client_options.app_name = Some("lumetra-backend".to_string());

    let client = Client::with_options(client_options)?;
    let db = client.database(&db_name);

    let state = AppState {
        layout_col: db.collection::<DashboardLayoutDoc>("dashboard_layout"),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/kpi", get(get_kpi))
        .route("/api/weekly-users", get(weekly_users))
        .route("/api/layout/:dashboardId", get(get_layout).put(put_layout))
        .with_state(state)
        .layer(cors);

    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    println!("🚀 Backend running at http://127.0.0.1:8080");

    axum::serve(listener, app).await?;
    Ok(())
}
