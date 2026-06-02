# ============================================================
#  eDistrict 2.0 — Module 2
#  Backend: FastAPI + SQLAlchemy (SQLite) + Pydantic
#  Run: uvicorn main:app --reload --port 8000
# ============================================================

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator, Field
from sqlalchemy import create_engine, Column, String, Float, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session, relationship
from typing import Optional, List
from datetime import date, datetime
import re, hashlib, random, string, os

# ─── Database setup ─────────────────────────────────────────
DATABASE_URL = "sqlite:///./edistrict.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

# ─── TABLE 1: services ──────────────────────────────────────
class ServiceDB(Base):
    __tablename__ = "services"

    service_id    = Column(String(20), primary_key=True)
    service_name  = Column(String(100), nullable=False)
    department    = Column(String(100), nullable=False)
    description   = Column(Text, nullable=True)
    required_docs = Column(Text, nullable=False)   # comma-separated
    fields_needed = Column(Text, nullable=False)   # comma-separated field names

    applications  = relationship("ApplicationDB", back_populates="service")

# ─── TABLE 2: citizen_profiles ──────────────────────────────
class CitizenProfileDB(Base):
    __tablename__ = "citizen_profiles"

    citizen_id     = Column(String(30), primary_key=True, index=True)
    full_name      = Column(String(100), nullable=False)
    dob            = Column(String(10),  nullable=False)
    gender         = Column(String(10),  nullable=False)
    mobile         = Column(String(10),  nullable=False, unique=True, index=True)
    email          = Column(String(120), nullable=True)
    district       = Column(String(60),  nullable=False)
    state          = Column(String(60),  nullable=False)
    pincode        = Column(String(6),   nullable=False)
    aadhaar_last4  = Column(String(4),   nullable=False)
    caste_category = Column(String(10),  nullable=False)
    annual_income  = Column(Float,       nullable=False)
    father_name    = Column(String(100), nullable=True)
    address        = Column(Text,        nullable=True)
    created_at     = Column(String(30),  default=lambda: datetime.utcnow().isoformat())
    updated_at     = Column(String(30),  default=lambda: datetime.utcnow().isoformat())

    applications   = relationship("ApplicationDB", back_populates="citizen")

# ─── TABLE 3: applications (links profile ↔ service) ────────
class ApplicationDB(Base):
    __tablename__ = "applications"

    app_id      = Column(String(30), primary_key=True)
    citizen_id  = Column(String(30), ForeignKey("citizen_profiles.citizen_id"))
    service_id  = Column(String(20), ForeignKey("services.service_id"))
    status      = Column(String(20), default="submitted")
    submitted_at= Column(String(30), default=lambda: datetime.utcnow().isoformat())
    form_data   = Column(Text, nullable=True)  # JSON string of submitted fields

    citizen     = relationship("CitizenProfileDB", back_populates="applications")
    service     = relationship("ServiceDB", back_populates="applications")

Base.metadata.create_all(bind=engine)

# ─── Seed 4 services on startup ─────────────────────────────
def seed_services(db: Session):
    if db.query(ServiceDB).count() > 0:
        return
    services = [
        ServiceDB(
            service_id    = "SVC001",
            service_name  = "Income Certificate",
            department    = "Revenue Department",
            description   = "Certificate stating annual family income for government schemes",
            required_docs = "Aadhaar Card,Ration Card,Bank Passbook,Self Declaration",
            fields_needed = "full_name,dob,gender,mobile,father_name,address,district,state,pincode,caste_category,annual_income"
        ),
        ServiceDB(
            service_id    = "SVC002",
            service_name  = "Domicile Certificate",
            department    = "Revenue Department",
            description   = "Certificate of permanent residence in the state",
            required_docs = "Aadhaar Card,Residence Proof,10th Marksheet",
            fields_needed = "full_name,dob,gender,mobile,address,district,state,pincode"
        ),
        ServiceDB(
            service_id    = "SVC003",
            service_name  = "Caste Certificate",
            department    = "Social Welfare Department",
            description   = "Certificate verifying caste category for reservations and benefits",
            required_docs = "Aadhaar Card,Ration Card,Old Caste Certificate (if any)",
            fields_needed = "full_name,dob,gender,mobile,father_name,address,district,state,pincode,caste_category"
        ),
        ServiceDB(
            service_id    = "SVC004",
            service_name  = "Student Scholarship",
            department    = "Education Department",
            description   = "Post-matric scholarship for SC/ST/OBC students",
            required_docs = "Aadhaar Card,Income Certificate,Caste Certificate,Marksheet,Bank Passbook",
            fields_needed = "full_name,dob,gender,mobile,email,father_name,address,district,state,pincode,caste_category,annual_income"
        ),
    ]
    db.add_all(services)
    db.commit()

# ─── Pydantic schemas ────────────────────────────────────────

class CitizenCreate(BaseModel):
    full_name:      str   = Field(..., min_length=3, max_length=100)
    dob:            str   = Field(..., description="YYYY-MM-DD")
    gender:         str   = Field(..., pattern="^(Male|Female|Other)$")
    mobile:         str
    email:          Optional[str] = None
    district:       str   = Field(..., min_length=2)
    state:          str   = Field(..., min_length=2)
    pincode:        str
    aadhaar_last4:  str
    caste_category: str   = Field(..., pattern="^(General|OBC|SC|ST)$")
    annual_income:  float = Field(..., ge=0)
    father_name:    Optional[str] = None
    address:        Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v):
        if not re.match(r"^[A-Za-z\s]+$", v):
            raise ValueError("Name must contain only letters and spaces")
        return v.strip().title()

    @field_validator("mobile")
    @classmethod
    def valid_mobile(cls, v):
        v = re.sub(r"[\s\-]", "", v)
        if not re.match(r"^[6-9]\d{9}$", v):
            raise ValueError("Must be 10 digits starting with 6–9")
        return v

    @field_validator("pincode")
    @classmethod
    def valid_pincode(cls, v):
        v = v.strip()
        if not re.match(r"^\d{6}$", v):
            raise ValueError("Must be exactly 6 digits")
        return v

class CitizenResponse(BaseModel):
    citizen_id: str; full_name: str; dob: str; gender: str
    mobile: str; email: Optional[str]; district: str; state: str
    pincode: str; aadhaar_last4: str; caste_category: str
    annual_income: float; father_name: Optional[str]; address: Optional[str]
    created_at: str
    model_config = {"from_attributes": True}

class ServiceResponse(BaseModel):
    service_id: str; service_name: str; department: str
    description: Optional[str]; required_docs: str; fields_needed: str
    model_config = {"from_attributes": True}

class ApplicationCreate(BaseModel):
    citizen_id: str
    service_id: str
    form_data:  dict

class AutoFillResponse(BaseModel):
    citizen_found: bool
    profile: Optional[dict]
    service: Optional[dict]
    prefilled_fields: dict
    missing_fields: List[str]

# ─── FastAPI app ─────────────────────────────────────────────

app = FastAPI(title="eDistrict Module 2", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://edistrict-module2-1.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def gen_citizen_id(district: str) -> str:
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"CG-{district[:3].upper()}-{date.today().year}-{suffix}"

def gen_app_id() -> str:
    return f"APP-{date.today().year}-{''.join(random.choices(string.digits, k=6))}"

# Seed on first request
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    seed_services(db)
    db.close()

# ─── ENDPOINTS ───────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "eDistrict Module 2"}

# GET all services
@app.get("/api/services", response_model=List[ServiceResponse])
def list_services(db: Session = Depends(get_db)):
    return db.query(ServiceDB).all()

# GET one service
@app.get("/api/services/{service_id}", response_model=ServiceResponse)
def get_service(service_id: str, db: Session = Depends(get_db)):
    svc = db.query(ServiceDB).filter(ServiceDB.service_id == service_id).first()
    if not svc:
        raise HTTPException(404, "Service not found")
    return svc

# POST create profile
@app.post("/api/citizen/profile", response_model=CitizenResponse, status_code=201)
def create_profile(data: CitizenCreate, db: Session = Depends(get_db)):
    existing = db.query(CitizenProfileDB).filter(CitizenProfileDB.mobile == data.mobile).first()
    if existing:
        raise HTTPException(409, f"Mobile already registered. Citizen ID: {existing.citizen_id}")
    profile = CitizenProfileDB(
        citizen_id=gen_citizen_id(data.district), **data.model_dump()
    )
    db.add(profile); db.commit(); db.refresh(profile)
    return profile

# GET profile by mobile (for login/lookup)
@app.get("/api/citizen/lookup/{mobile}", response_model=CitizenResponse)
def lookup_by_mobile(mobile: str, db: Session = Depends(get_db)):
    profile = db.query(CitizenProfileDB).filter(CitizenProfileDB.mobile == mobile).first()
    if not profile:
        raise HTTPException(404, "No profile found for this mobile number")
    return profile

# GET profile by citizen_id
@app.get("/api/citizen/{citizen_id}", response_model=CitizenResponse)
def get_profile(citizen_id: str, db: Session = Depends(get_db)):
    profile = db.query(CitizenProfileDB).filter(CitizenProfileDB.citizen_id == citizen_id).first()
    if not profile:
        raise HTTPException(404, "Citizen not found")
    return profile

# ★ KEY ENDPOINT: Auto-fill — given mobile + service_id, return prefilled form
@app.get("/api/autofill/{mobile}/{service_id}", response_model=AutoFillResponse)
def autofill(mobile: str, service_id: str, db: Session = Depends(get_db)):
    profile = db.query(CitizenProfileDB).filter(CitizenProfileDB.mobile == mobile).first()
    service = db.query(ServiceDB).filter(ServiceDB.service_id == service_id).first()
    if not service:
        raise HTTPException(404, "Service not found")

    required_fields = [f.strip() for f in service.fields_needed.split(",")]

    if not profile:
        return AutoFillResponse(
            citizen_found=False, profile=None,
            service={"service_id": service.service_id, "service_name": service.service_name,
                     "required_docs": service.required_docs.split(",")},
            prefilled_fields={}, missing_fields=required_fields
        )

    # Map profile fields to form fields
    profile_dict = {
        "full_name": profile.full_name,
        "dob": profile.dob,
        "gender": profile.gender,
        "mobile": profile.mobile,
        "email": profile.email,
        "district": profile.district,
        "state": profile.state,
        "pincode": profile.pincode,
        "caste_category": profile.caste_category,
        "annual_income": profile.annual_income,
        "father_name": profile.father_name,
        "address": profile.address,
    }

    prefilled = {}
    missing = []
    for field in required_fields:
        val = profile_dict.get(field)
        if val is not None and val != "":
            prefilled[field] = val
        else:
            missing.append(field)

    return AutoFillResponse(
        citizen_found=True,
        profile={"citizen_id": profile.citizen_id, "full_name": profile.full_name,
                 "mobile": profile.mobile, "district": profile.district},
        service={"service_id": service.service_id, "service_name": service.service_name,
                 "department": service.department,
                 "required_docs": service.required_docs.split(",")},
        prefilled_fields=prefilled,
        missing_fields=missing
    )

# POST submit application
@app.post("/api/application/submit", status_code=201)
def submit_application(data: ApplicationCreate, db: Session = Depends(get_db)):
    import json
    citizen = db.query(CitizenProfileDB).filter(CitizenProfileDB.citizen_id == data.citizen_id).first()
    if not citizen:
        raise HTTPException(404, "Citizen not found")
    service = db.query(ServiceDB).filter(ServiceDB.service_id == data.service_id).first()
    if not service:
        raise HTTPException(404, "Service not found")
    app_record = ApplicationDB(
        app_id=gen_app_id(),
        citizen_id=data.citizen_id,
        service_id=data.service_id,
        form_data=json.dumps(data.form_data)
    )
    db.add(app_record); db.commit(); db.refresh(app_record)
    return {"status": "submitted", "app_id": app_record.app_id,
            "service_name": service.service_name, "submitted_at": app_record.submitted_at}

# GET applications by citizen
@app.get("/api/citizen/{citizen_id}/applications")
def get_applications(citizen_id: str, db: Session = Depends(get_db)):
    apps = db.query(ApplicationDB).filter(ApplicationDB.citizen_id == citizen_id).all()
    return [{"app_id": a.app_id, "service_id": a.service_id,
             "service_name": a.service.service_name, "status": a.status,
             "submitted_at": a.submitted_at} for a in apps]


# ─── LOGIN endpoint ──────────────────────────────────────────
class LoginRequest(BaseModel):
    mobile: str
    aadhaar_last4: str

class LoginResponse(BaseModel):
    success: bool
    citizen_id: Optional[str] = None
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    message: str

@app.post("/api/auth/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    mobile = re.sub(r"[\s\-]", "", data.mobile)
    profile = db.query(CitizenProfileDB).filter(CitizenProfileDB.mobile == mobile).first()
    if not profile:
        return LoginResponse(success=False, message="Mobile number not registered. Please register first.")
    if profile.aadhaar_last4 != data.aadhaar_last4:
        return LoginResponse(success=False, message="Incorrect Aadhaar last 4 digits. Please try again.")
    return LoginResponse(
        success=True,
        citizen_id=profile.citizen_id,
        full_name=profile.full_name,
        mobile=profile.mobile,
        message="Login successful"
    )

# =========================
# ADMIN / DEBUG ENDPOINTS
# =========================

@app.get("/api/admin/dashboard")
def dashboard(db: Session = Depends(get_db)):
    return {
        "total_citizens": db.query(CitizenProfileDB).count(),
        "total_services": db.query(ServiceDB).count(),
        "total_applications": db.query(ApplicationDB).count()
    }


@app.get("/api/admin/citizens")
def get_all_citizens(db: Session = Depends(get_db)):
    return db.query(CitizenProfileDB).all()


@app.get("/api/admin/services")
def get_all_services(db: Session = Depends(get_db)):
    return db.query(ServiceDB).all()


@app.get("/api/admin/applications")
def get_all_applications(db: Session = Depends(get_db)):
    return db.query(ApplicationDB).all()