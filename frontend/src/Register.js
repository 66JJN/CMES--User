import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  // 1. จัดการการเปลี่ยนแปลงของเบอร์โทรศัพท์ (อนุญาตให้เป็นตัวเลข 10 หลักเท่านั้น)
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // อนุญาตให้เป็นค่าว่าง หรือตัวเลข 0-10 หลักเท่านั้น
    if (value === "" || /^\d{0,10}$/.test(value)) {
      setPhone(value);
      setErrorMessage("");
    }
  };

  // 2. จัดการการลงทะเบียน (เมื่อกดปุ่ม)
  const handleRegister = async () => {
    // ตรวจสอบความถูกต้องของเบอร์โทรศัพท์
    if (!phone || phone.length !== 10) {
      setErrorMessage("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)");
      return;
    }

    try {
      // 3. บันทึกเบอร์โทรศัพท์ลงใน Local Storage
      localStorage.setItem('userPhone', phone);
      
      // 4. นำทางไปยังหน้า /profile ทันที
      navigate('/profile');
    } catch (error) {
      console.error("Error during registration:", error);
      setErrorMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h2>ลงทะเบียน</h2>
        <p className="welcome-text">ยินดีต้อนรับสู่ระบบของเรา</p>
        
        <div className="form-group">
          <label htmlFor="phone">เบอร์โทรศัพท์</label>
          <div className="phone-input-container">
            <span className="country-code">+66</span>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="เบอร์โทรศัพท์ 10 หลัก"
              maxLength="10"
            />
          </div>
          {/* แสดงข้อความ Error หากมี */}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>

        {/* ปุ่มที่ใช้เรียก handleRegister */}
        <button className="register-button" onClick={handleRegister}>
          ดำเนินการต่อ
        </button>

        <p className="terms-text">
          การลงทะเบียนถือว่าคุณยอมรับ <a href="/terms">เงื่อนไขการใช้งาน</a>
        </p>
      </div>
    </div>
  );
}

export default Register;