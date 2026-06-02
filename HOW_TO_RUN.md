# eDistrict Module 2 — How to Run

## BACKEND (Terminal 1)
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API runs at: http://localhost:8000
Swagger docs: http://localhost:8000/docs

## FRONTEND (Terminal 2)
```bash
cd frontend
npm install
npm start
```
App runs at: http://localhost:3000

## DEMO LOGIN
- Mobile: 9876543210
- Aadhaar last 4: 4821

## FLOW
1. Login page → enter mobile + aadhaar last 4
2. Dashboard shows citizen profile + past applications
3. Click Apply → select service → form auto-fills from profile
4. Submit → application saved to DB
5. Register tab → create new citizen profile
