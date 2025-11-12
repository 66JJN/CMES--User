import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import fetch from "node-fetch";
import FormData from "form-data";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import bodyParser from "body-parser";
import twilio from "twilio";
import axios from "axios";
import http from "http";
import { Server as SocketIoServer } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const port = 4000; 

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const expectedAmount = parseInt(process.env.EXPECTED_AMOUNT, 10); // จำนวนเงินที่คาดหวัง

app.use(bodyParser.json()); // เพิ่ม body-parser (ถ้ายังไม่มี)
app.use(express.static("uploads")); // ให้สามารถเข้าถึงไฟล์ใน uploads ผ่าน URL

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Endpoint สำหรับส่ง OTP
app.post("/api/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "กรุณาระบุหมายเลขโทรศัพท์" });
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ success: false, message: "หมายเลขโทรศัพท์ไม่ถูกต้อง" });
  }

  var config = {
    method: 'post',
    url: 'https://portal-otp.smsmkt.com/api/otp-send',
    headers: {
      "Content-Type": "application/json",
      "api_key": "2607fce6276d1f68e8d543e953d76bc4",
      "secret_key": "5yX5m9LcHVNks99i",
    },
    data: JSON.stringify({
      "project_key": "69a425bf4f",
      "phone": phone,
    })
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data));

    if (response.data.code === "000") {
      res.json({
        success: true,
        message: "OTP ส่งสำเร็จ",
        token: response.data.result.token,
      });
    } else {
      res.status(400).json({
        success: false,
        message: response.data.detail,
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error.message || error);
    res.status(500).json({ success: false, message: "ไม่สามารถส่ง OTP ได้" });
  }
});

// ตรวจสอบ OTP
app.post("/api/verify-otp", async (req, res) => {
  const { otp, token, phone, birthday } = req.body;

  if (!otp || !token) {
    return res.status(400).json({ success: false, message: "กรุณาระบุ OTP และ token" });
  }

  const verifyData = {
    otp_code: otp,
    token: token,
    ref_code: "",
  };

  const config = {
    method: "post",
    url: "https://portal-otp.smsmkt.com/api/otp-validate",
    headers: {
      "Content-Type": "application/json",
      api_key: "2607fce6276d1f68e8d543e953d76bc4",
      secret_key: "5yX5m9LcHVNks99i",
    },
    data: JSON.stringify(verifyData),
  };

  try {
    const response = await axios(config);

    if (response.data.code === "000") {
      // สร้างข้อมูลผู้ใช้ใหม่
      const userData = {
        phone,
        birthday,
        lastBirthdayUpdate: new Date().toISOString(),
      };

      // ส่งข้อมูลไปยัง admin backend เพื่อบันทึก
      const adminResponse = await fetch("http://localhost:5001/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (adminResponse.ok) {
        const { token } = await adminResponse.json();
        res.json({ 
          success: true, 
          message: "OTP verified successfully",
          token,
          user: userData
        });
      } else {
        throw new Error("Failed to create user");
      }
    } else {
      console.error("SMSMKT Error:", response.data.detail);
      res.status(400).json({ success: false, message: response.data.detail });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error.message || error);
    res.status(500).json({ success: false, message: "ไม่สามารถตรวจสอบ OTP ได้" });
  }
});

// อัพเดตวันเกิด
app.post("/api/update-birthday", async (req, res) => {
  const { birthday } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "ไม่พบ token" });
  }

  if (!birthday) {
    return res.status(400).json({ success: false, message: "กรุณาระบุวันเกิด" });
  }

  try {
    // ส่งคำขออัพเดตวันเกิดไปยัง admin backend
    const response = await fetch("http://localhost:5001/api/users/update-birthday", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ 
        birthday,
        lastBirthdayUpdate: new Date().toISOString()
      })
    });

    if (response.ok) {
      const data = await response.json();
      res.json({ success: true, message: "อัพเดตวันเกิดสำเร็จ", user: data });
    } else {
      throw new Error("Failed to update birthday");
    }
  } catch (error) {
    console.error("Error updating birthday:", error);
    res.status(500).json({ success: false, message: "ไม่สามารถอัพเดตวันเกิดได้" });
  }
});

// ตั้งค่าการเก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.use(express.json());

// เพิ่ม endpoint สำหรับตรวจสอบวันเกิด
app.get("/api/check-birthday", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ status: "error", message: "ไม่พบ token" });
  }

  try {
    const response = await fetch("http://localhost:5001/api/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    }

    const userData = await response.json();
    if (!userData.birthday) {
      return res.json({ isBirthday: false });
    }

    // ตรวจสอบว่าเป็นวันเกิดหรือไม่
    const birthday = new Date(userData.birthday);
    const today = new Date();
    const isBirthday = birthday.getDate() === today.getDate() && 
                      birthday.getMonth() === today.getMonth();

    // ตรวจสอบว่าสามารถแก้ไขวันเกิดได้หรือไม่ (ทุก 3 เดือน)
    const lastBirthdayUpdate = new Date(userData.lastBirthdayUpdate || userData.birthday);
    const monthsDiff = (today.getFullYear() - lastBirthdayUpdate.getFullYear()) * 12 + 
                      today.getMonth() - lastBirthdayUpdate.getMonth();
    const canUpdateBirthday = monthsDiff >= 3;

    res.json({ 
      isBirthday,
      canUpdateBirthday,
      birthday: userData.birthday,
      lastBirthdayUpdate: userData.lastBirthdayUpdate
    });

  } catch (err) {
    console.error("Error checking birthday:", err);
    res.status(500).json({ status: "error", message: "ไม่สามารถตรวจสอบวันเกิดได้" });
  }
});

app.post("/api/report", async (req, res) => {
  const { category, detail } = req.body;
  if (!category || !detail) {
    return res.status(400).json({ status: "error", message: "category and detail are required" });
  }
  try {
    const adminRes = await fetch("http://localhost:5001/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, detail }),
    });
    const adminData = await adminRes.json();
    if (adminRes.ok) {
      res.json({ status: "ok" });
    } else {
      res.status(500).json({ status: "error", message: adminData.message });
    }
  } catch (err) {
    console.error("ส่งข้อมูลไป admin ไม่สำเร็จ:", err); // เพิ่ม log error
    res.status(500).json({ status: "error", message: "ส่งข้อมูลไป admin ไม่สำเร็จ" });
  }
});

// เพิ่ม API OCR
app.post("/api/ocr", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "error", message: "No file uploaded" });
  }
  try {
    const { data: { text } } = await Tesseract.recognize(
      req.file.path,
      "tha+eng"
    );
    res.json({ status: "ok", text });
  } catch (err) {
    res.status(500).json({ status: "error", message: "OCR failed" });
  }
});

app.post("/verify-slip", upload.single("slip"), async (req, res) => {
  console.log("===> เข้ามา /verify-slip แล้ว");
  let status = "failed";
  let detail = "";
  const amount = req.body.amount;

  if (!req.file) {
    console.log("===> ไม่พบไฟล์สลิป");
    detail = "ไม่พบไฟล์สลิป";
    await fetch("http://localhost:4000/api/stat-slip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "payment", detail, status, amount }),
    });
    return res.json({ success: false, message: detail });
  }

  try {
    console.log("===> เริ่ม OCR");
    const { data: { text } } = await Tesseract.recognize(
      req.file.path,
      "tha+eng"
    );
    const textArabic = thaiToArabic(text);
    const cleanText = textArabic.replace(/[\s,\,\.]/g, "");
    const cleanAmount = String(amount).replace(/[\s,\,\.]/g, "");
    const cleanAmountDot = String(Number(amount).toFixed(2)).replace(/[\s,\,\.]/g, "");

    console.log("OCR TEXT:", text);
    console.log("cleanText:", cleanText);
    console.log("cleanAmount:", cleanAmount);
    console.log("cleanAmountDot:", cleanAmountDot);

    // ตัวเลือกที่ 1: ตรงกับจำนวนเงิน + "บาท"
    const match1 = cleanText.includes(cleanAmount + "บาท");
    const match2 = cleanText.includes(cleanAmountDot + "บาท");

    // ตัวเลือกที่ 2: ตรงกับจำนวนเงินแบบตรงตัว (แต่ต้องไม่ซ้อนกับเลขอื่น)
    const match3 = cleanText.split("บาท")[0].endsWith(cleanAmount);
    const match4 = cleanText.split("บาท")[0].endsWith(cleanAmountDot);

    console.log("match1:", match1, "match2:", match2, "match3:", match3, "match4:", match4);

    if (match1 || match2 || match3 || match4) {
      status = "success";
      detail = `ชำระเงินสำเร็จ จำนวนเงิน: ${amount}`;
      console.log("===> ตรวจพบจำนวนเงินในสลิป");
      await fetch("http://localhost:5001/api/stat-slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", detail, status, amount }),
      });
      return res.json({ success: true });
    } else {
      detail = "ชำระเงินไม่ถูกต้อง หรือจำนวนเงินไม่ตรง";
      console.log("===> ชำระเงินไม่ถูกต้อง หรือจำนวนเงินไม่ตรง");
      await fetch("http://localhost:5001/api/stat-slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", detail, status, amount }),
      });
      return res.json({ success: false, message: detail });
    }
  } catch (err) {
    detail = "OCR ผิดพลาด";
    console.log("===> OCR ผิดพลาด", err);
    await fetch("http://localhost:5001/api/stat-slip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "payment", detail, status, amount }),
    });
    return res.json({ success: false, message: detail });
  }
});

function thaiToArabic(str) {
  return str.replace(/[๐-๙]/g, d => "0123456789"["๐๑๒๓๔๕๖๗๘๙".indexOf(d)]);
}

// เก็บข้อมูลรอชำระเงิน
let pendingUploads = new Map();

// API สำหรับบันทึกข้อมูลรอชำระเงิน
app.post("/api/upload", upload.single("file"), (req, res) => {
  const { text, type, time, price, sender } = req.body;
  const uploadId = Date.now().toString();
  
  const uploadData = {
    id: uploadId,
    text,
    type,
    time,
    price,
    sender,
    file: req.file ? req.file.filename : null,
    filePath: req.file ? req.file.path : null,
    timestamp: new Date(),
    status: 'pending',
    socialType: req.body.socialType,
    socialName: req.body.socialName,
  };
  
  // เก็บข้อมูลรอชำระเงิน
  pendingUploads.set(uploadId, uploadData);
  
  // ตั้งเวลายกเลิก 10 นาที
  setTimeout(() => {
    if (pendingUploads.has(uploadId)) {
      console.log(`Upload ${uploadId} expired after 10 minutes`);
      pendingUploads.delete(uploadId);
    }
  }, 10 * 60 * 1000); // 10 นาที
  
  res.json({ success: true, uploadId });
});

// API สำหรับยืนยันการชำระเงิน
app.post("/api/confirm-payment", async (req, res) => {
  try {
    const { uploadId } = req.body;
    
    if (!uploadId) {
      return res.status(400).json({ success: false, message: 'Missing uploadId' });
    }
    
    const uploadData = pendingUploads.get(uploadId);
    
    if (!uploadData) {
      return res.status(404).json({ success: false, message: 'Upload not found or expired' });
    }
    
    // ส่งข้อมูลไปยัง Admin backend
    const formData = new FormData();
    formData.append('text', uploadData.text || '');
    formData.append('type', uploadData.type);
    formData.append('time', uploadData.time.toString());
    formData.append('price', uploadData.price.toString());
    formData.append('sender', uploadData.sender);
    formData.append('textColor', uploadData.textColor || 'white'); // เพิ่มสีข้อความ
    
    // ส่งไฟล์หากมี
    if (uploadData.file) {
      const filePath = path.join(__dirname, 'uploads', uploadData.file);
      if (fs.existsSync(filePath)) {
        formData.append('file', fs.createReadStream(filePath));
      }
    }
    
    // ส่งข้อมูลไปยัง Admin backend
    const response = await fetch('http://localhost:5001/api/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    if (response.ok) {
      // ลบข้อมูลออกจากรายการรอชำระเงิน
      pendingUploads.delete(uploadId);
      
      console.log('Successfully sent to admin backend');
      res.json({ success: true, message: 'Payment confirmed and data sent to admin' });
    } else {
      throw new Error('Failed to send to admin backend');
    }
    
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน' });
  }
});

// API สำหรับตรวจสอบสถานะ upload
app.get("/api/upload-status/:uploadId", (req, res) => {
  const { uploadId } = req.params;
  
  if (pendingUploads.has(uploadId)) {
    const data = pendingUploads.get(uploadId);
    res.json({ exists: true, status: data.status });
  } else {
    res.json({ exists: false });
  }
});

// API สำหรับอัปโหลดรูปภาพและข้อความ
app.post("/upload-content", upload.single("image"), (req, res) => {
  const { message } = req.body;
  const imageUrl = req.file ? `http://localhost:${port}/uploads/${req.file.filename}` : null;

  console.log("Message:", message);
  console.log("Image URL:", imageUrl);

  res.json({ success: true, message, imageUrl });
});

// API เดิมสำหรับอัปโหลดรูปภาพ
app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ imageUrl: `http://localhost:${port}/uploads/${req.file.filename}` });
});

// Endpoint สำหรับส่ง OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "กรุณาระบุหมายเลขโทรศัพท์" });
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ success: false, message: "หมายเลขโทรศัพท์ไม่ถูกต้อง" });
  }

  const config = {
    method: 'post',
    url: 'https://portal-otp.smsmkt.com/api/otp-send',
    headers: {
      "Content-Type": "application/json",
      "api_key": "2607fce6276d1f68e8d543e953d76bc4",
      "secret_key": "5yX5m9LcHVNks99i",
    },
    data: JSON.stringify({
      "project_key": "69a425bf4f",
      "phone": phone,
    })
  };

  try {
    const response = await axios(config);
    console.log(JSON.stringify(response.data));

    if (response.data.code === "000") {
      res.json({
        success: true,
        message: "OTP ส่งสำเร็จ",
        token: response.data.result.token,
      });
    } else {
      res.status(400).json({
        success: false,
        message: response.data.detail,
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error.message || error);
    res.status(500).json({ success: false, message: "ไม่สามารถส่ง OTP ได้" });
  }
});

// ตรวจสอบ OTP
app.post("/verify-otp", async (req, res) => {
  const { otp, token } = req.body;

  if (!otp || !token) {
    return res.status(400).json({ success: false, message: "กรุณาระบุ OTP และ token" });
  }

  const verifyData = {
    otp_code: otp,
    token: token,
    ref_code: "",
  };

  const config = {
    method: "post",
    url: "https://portal-otp.smsmkt.com/api/otp-validate",
    headers: {
      "Content-Type": "application/json",
      api_key: "2607fce6276d1f68e8d543e953d76bc4",
      secret_key: "5yX5m9LcHVNks99i",
    },
    data: JSON.stringify(verifyData),
  };

  try {
    const response = await axios(config);

    if (response.data.code === "000") {
      res.json({ success: true, message: "OTP verified successfully" });
    } else {
      console.error("SMSMKT Error:", response.data.detail);
      res.status(400).json({ success: false, message: response.data.detail });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error.message || error);
    res.status(500).json({ success: false, message: "ไม่สามารถตรวจสอบ OTP ได้" });
  }
});

// ตรวจสอบการชำระเงิน
app.post("/verify-payment", (req, res) => {
  const { amount, method } = req.body;

  if (!amount || !method) {
    return res.status(400).json({ success: false, message: "กรุณาระบุจำนวนเงินและวิธีการชำระเงิน" });
  }

  if (amount === expectedAmount && method === "promptpay") {
    return res.json({ success: true });
  } else {
    return res.json({ success: false });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Socket.IO setup
const server = http.createServer(app);
const io = new SocketIoServer(server, { cors: { origin: "*" } });

let config = {
  enableImage: true,
  enableText: true,
  price: 100,
  time: 10
};

io.on("connection", (socket) => {
  socket.emit("configUpdate", config);

  socket.on("adminUpdateConfig", (newConfig) => {
    config = { ...config, ...newConfig };
    io.emit("configUpdate", config);
  });
});

// เปลี่ยนจาก app.listen เป็น server.listen
server.listen(port, () => {
  console.log(`Server + WebSocket running on http://localhost:${port}`);
});