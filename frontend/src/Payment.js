import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import axios from "axios"; // ลบออกถ้าไม่ได้ใช้
import "./Payment.css";
import promptpayLogo from "./data-icon/promptpay-logo.png";
import paymentLogo from "./data-icon/payment-logo.jpg";
import { incrementQueueNumber } from "./utils";
import SlipUpload from "./SlipUpload";

function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get("type");
  const time = queryParams.get("time");
  const price = queryParams.get("price");

  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  // const [phone, setPhone] = useState(""); // ลบออกถ้าไม่ได้ใช้
  // const [otp, setOtp] = useState("");     // ลบออกถ้าไม่ได้ใช้
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // เพิ่ม

  console.log("[Payment render] showSuccessModal =", showSuccessModal);

  const handleConfirmPayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage("");
    try {
      const pendingUploadId = localStorage.getItem("pendingUploadId");
      // ชั่วคราวปิด fetch ยืนยัน เพื่อตรวจ modal
      // if (pendingUploadId) { ...fetch... }

      console.log("[Payment] simulate success flow");
      const currentQueueNumber = incrementQueueNumber();
      localStorage.setItem("order", JSON.stringify({
        type, time, price, queueNumber: currentQueueNumber
      }));
      localStorage.removeItem("pendingUploadId");
      // เคลียร์ draft หลังจ่ายสำเร็จ
      localStorage.removeItem("uploadFormDraft");
      localStorage.removeItem("uploadFormImage");

      setShowPopup(false);
      setShowSuccessModal(true); // แสดงป๊อปอัพสำเร็จ
      console.log("[Payment] after setShowSuccessModal ->", true);
    } catch (err) {
      console.error("[Payment] Error:", err);
      setErrorMessage("❌ เกิดข้อผิดพลาดในการยืนยันการชำระเงิน");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSelection = (method) => {
    if (!method) return;
    setPaymentMethod(method);
    setShowPopup(true);
    setErrorMessage("");
  };

  const closePopup = () => {
    setShowPopup(false);
    setErrorMessage("");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="payment-container">
      <div className="payment-wrapper">
        <header className="payment-header">
          <button className="back-btn" onClick={handleGoBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>ชำระเงิน</h1>
          <div></div>
        </header>

        <main className="payment-main">
          <div className="content-card">
            {/* Order Summary */}
            <div className="order-summary">
              <div className="summary-header">
                <div className="summary-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                    <path d="M3 12h6m6 0h6"/>
                  </svg>
                </div>
                <h2>สรุปรายการ</h2>
              </div>
              
              <div className="summary-details">
                <div className="summary-item">
                  <span className="item-label">บริการ:</span>
                  <span className="item-value">
                    {type === "image" ? "รูปภาพ + ข้อความ" : "ข้อความ"}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="item-label">ระยะเวลา:</span>
                  <span className="item-value">{time} นาที</span>
                </div>
                <div className="summary-item total-item">
                  <span className="item-label">ยอดรวม:</span>
                  <span className="item-value total-price">฿{price}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="payment-section">
              <h3>เลือกวิธีการชำระเงิน</h3>
              <div className="payment-methods">
                <div
                  className={`payment-method ${paymentMethod === "promptpay" ? "selected" : ""}`}
                  onClick={() => setPaymentMethod("promptpay")}
                >
                  <div className="method-icon">
                    <img src={promptpayLogo} alt="PromptPay" />
                  </div>
                  <div className="method-info">
                    <h4>PromptPay</h4>
                    <p>ชำระผ่าน QR Code</p>
                  </div>
                  <div className="method-check">
                    {paymentMethod === "promptpay" && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    )}
                  </div>
                </div>
                {/* ลบปุ่ม TrueMoney ออก */}
              </div>
            </div>

            {/* Error/Success Message */}
            {errorMessage && (
              <div className={`alert-message ${errorMessage.includes("✅") ? 'success' : 'error'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {errorMessage.includes("✅") ? (
                    <path d="M20 6L9 17l-5-5"/>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </>
                  )}
                </svg>
                {errorMessage}
              </div>
            )}

            {/* Continue Button */}
            <div className="action-buttons">
              <button className="secondary-btn" onClick={handleGoBack}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                ย้อนกลับ
              </button>
              <button
                className="primary-btn"
                onClick={() => handlePaymentSelection(paymentMethod)}
                disabled={!paymentMethod || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="spinner"></div>
                    กำลังประมวลผล...
                  </>
                ) : (
                  <>
                    ดำเนินการชำระเงิน
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>

        {/* PromptPay Popup */}
        {showPopup && paymentMethod === "promptpay" && (
          <div className="modal-overlay" onClick={closePopup}>
            <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>ชำระเงินผ่าน PromptPay</h3>
                <button className="close-button" onClick={closePopup}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="qr-section">
                  <img src={paymentLogo} alt="QR Code" className="qr-code" />
                  <div className="amount-display">
                    <span className="amount-label">ยอดชำระ</span>
                    <span className="amount-value">฿{price}</span>
                  </div>
                </div>
                <div className="payment-steps">
                  <h4>ขั้นตอนการชำระเงิน</h4>
                  <ol>
                    <li>เปิดแอปธนาคาร</li>
                    <li>เลือก "สแกน QR"</li>
                    <li>สแกน QR Code ข้างต้น</li>
                    <li>ยืนยันยอดเงินและชำระ</li>
                    <li>อัปโหลดสลิปเพื่อยืนยัน</li>
                  </ol>
                </div>
                <SlipUpload price={price} onSuccess={() => {
                  console.log("[Payment] SlipUpload onSuccess fired");
                  handleConfirmPayment();
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 420, textAlign: "center" }}>
              <h3 style={{ marginBottom: 12 }}>ชำระเงินสำเร็จ</h3>
              <p style={{ marginBottom: 24 }}>ระบบได้รับข้อมูลแล้ว</p>
              <button
                onClick={() => navigate("/home")}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  padding: "10px 22px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  width: "100%"
                }}
              >
                ไปหน้าหลัก
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Payment;
