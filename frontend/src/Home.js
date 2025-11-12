import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [order, setOrder] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [status, setStatus] = useState({
    systemOn: true,
    imageOn: true,
    textOn: true,
    birthdayOn: true,
  });

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));

    const storedOrder = localStorage.getItem("order");
    try {
      const parsedOrder = JSON.parse(storedOrder);
      if (
        parsedOrder &&
        typeof parsedOrder === "object" &&
        parsedOrder.queueNumber &&
        parsedOrder.type &&
        parsedOrder.time &&
        parsedOrder.price
      ) {
        setOrder(parsedOrder);
      } else {
        localStorage.removeItem("order");
      }
    } catch (error) {
      localStorage.removeItem("order");
    }
  }, []);

  useEffect(() => {
    if (order && order !== "#") {
      const endTime = new Date(localStorage.getItem("endTime"));
      const timeDuration = parseInt(order.time, 10);
      if (!isNaN(endTime.getTime()) && !isNaN(timeDuration)) {
        const startTime = new Date(endTime.getTime() - timeDuration * 60000);
        const startHours = startTime.getHours().toString().padStart(2, "0");
        const startMinutes = startTime.getMinutes().toString().padStart(2, "0");
        const endHours = endTime.getHours().toString().padStart(2, "0");
        const endMinutes = endTime.getMinutes().toString().padStart(2, "0");
        setStartTime(`${startHours}:${startMinutes}`);
        setEndTime(`${endHours}:${endMinutes}`);
      }
    }
  }, [order]);

  // สร้าง socket connection
  const socket = io("http://localhost:4005");

  useEffect(() => {
    // รับ config จาก backend
    socket.on("configUpdate", (newConfig) => {
      setStatus({
        systemOn: newConfig.systemOn,
        imageOn: newConfig.enableImage,
        textOn: newConfig.enableText,
        birthdayOn: newConfig.enableBirthday,
      });
    });
    return () => socket.off("configUpdate");
  }, [socket]); 

  useEffect(() => {
    
    socket.on("status", (newStatus) => {
      // ถ้าไม่ได้ใช้ setStatus ให้ลบบรรทัดนี้
      // setStatus(newStatus);
    });
    return () => socket.off("status");
  }, [socket]); 

  // ดึงสถานะล่าสุดจาก backend เมื่อเข้า Home
  useEffect(() => {
    fetch("http://localhost:4000/api/status")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  const handleSelect = (type) => {
    navigate(`/select?type=${type}`);
  };

  const handleCheckStatus = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div className="home-container">
      {/* Floating Background Elements */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="home-wrapper">
        <header className="home-header">
          <div className="header-brand">
            <div className="brand-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="brand-text">
              <h1>Digital Signage CMS</h1>
              <p>University of Phayao, Thailand</p>
            </div>
          </div>
          
          <nav className="header-nav">
            {isLoggedIn ? (
              <Link to="/Profile" className="nav-btn profile-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
              </Link>
            ) : (
              <div className="auth-buttons">
                <Link to="/signin" className="nav-btn signin-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign In
                </Link>
                <Link to="/signup" className="nav-btn signup-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  Sign Up
                </Link>
              </div>
            )}
            <Link to="/report" className="nav-btn report-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Report
            </Link>
          </nav>
        </header>

        <main className="home-main">
          <div className="hero-section">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-dot"></span>
                <span>ระบบแสดงผลดิจิทัล</span>
              </div>
              <h2>แชร์เนื้อหาของคุณสู่หน้าจอ</h2>
              <p>เลือกส่งรูปภาพหรือข้อความไปแสดงบนหน้าจอดิจิทัลได้ง่ายๆ</p>
            </div>
          </div>

          <div className="service-cards">
            {status.systemOn ? (
              <>
                {status.imageOn && (
                  <div className="service-card image-service" onClick={() => handleSelect("image")}>
                    <div className="card-header">
                      <div className="service-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <path d="M21 15l-5-5L5 21"/>
                        </svg>
                      </div>
                      <div className="service-badge">ภาพ + ข้อความ</div>
                    </div>
                    <div className="card-content">
                      <h3>ส่งรูปขึ้นจอ</h3>
                      <p>อัปโหลดรูปภาพพร้อมข้อความแสดงบนหน้าจอดิจิทัล</p>
                      <div className="card-features">
                        <span className="feature">📸 รองรับ JPG, PNG, GIF</span>
                        <span className="feature">💬 เพิ่มข้อความได้</span>
                        <span className="feature">🎨 เลือกสีข้อความ</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="price-from">เริ่มต้น 1 บาท</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                )}
                {status.textOn && (
                  <div className="service-card text-service" onClick={() => handleSelect("text")}>
                    <div className="card-header">
                      <div className="service-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <line x1="10" y1="9" x2="8" y2="9"/>
                        </svg>
                      </div>
                      <div className="service-badge">ข้อความ</div>
                    </div>
                    <div className="card-content">
                      <h3>ส่งข้อความขึ้นจอ</h3>
                      <p>ส่งข้อความประกาศหรือโฆษณาแสดงบนหน้าจอดิจิทัล</p>
                      <div className="card-features">
                        <span className="feature">✏️ ข้อความ 36 ตัวอักษร</span>
                        <span className="feature">🎨 เลือกสีข้อความ</span>
                        <span className="feature">⚡ ง่ายและรวดเร็ว</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="price-from">เริ่มต้น 1 บาท</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                )}
                {status.birthdayOn && (
                  <div
                    className="service-card birthday-service"
                    onClick={async () => {
                      if (!isLoggedIn) {
                        navigate('/select');
                        return;
                      }
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch("http://localhost:4000/api/check-birthday", {
                          headers: {
                            Authorization: `Bearer ${token}`
                          }
                        });
                        
                        if (!response.ok) {
                          throw new Error("ไม่สามารถตรวจสอบวันเกิดได้");
                        }
                        
                        const data = await response.json();
                        if (data.isBirthday) {
                          navigate("/upload?type=birthday&free=true");
                        } else {
                          navigate("/select?type=birthday");
                        }
                      } catch (error) {
                        console.error("Error checking birthday:", error);
                        setAlertMessage("ไม่สามารถตรวจสอบวันเกิดได้ กรุณาลองใหม่อีกครั้ง");
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      background: "linear-gradient(90deg, #fbbf24 0%, #f472b6 100%)",
                      color: "#fff",
                      boxShadow: "0 2px 12px rgba(30,41,59,0.08)",
                    }}
                  >
                    <div className="card-header">
                      <div className="service-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <path d="M21 15l-5-5L5 21"/>
                        </svg>
                      </div>
                      <div className="service-badge">ภาพ + ข้อความ</div>
                    </div>
                    <div className="card-content">
                      <h3>อวยพรวันเกิด</h3>
                      <p>อัปโหลดรูปภาพพร้อมข้อความแสดงบนหน้าจอดิจิทัล{isLoggedIn && " (ฟรีในวันเกิดของคุณ!)"}</p>
                      <div className="card-features">
                        <span className="feature">📸 รองรับ JPG, PNG, GIF</span>
                        <span className="feature">💬 เพิ่มข้อความได้</span>
                        <span className="feature">🎨 เลือกสีข้อความ</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="price-from">{isLoggedIn ? "ฟรีในวันเกิดของคุณ!" : "ฟรีสำหรับคนเกิดวันนี้"}</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                )}
                {alertMessage && (
                  <div className="alert-message" style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    background: "#f44336",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    zIndex: 1000
                  }}>
                    {alertMessage}
                  </div>
                )}
                {/* ถ้าไม่มีฟังก์ชันเปิดเลย ให้แสดงข้อความแจ้งเตือน */}
                {!status.imageOn && !status.textOn && !status.birthdayOn && (
                  <div
                    style={{
                      width: "100%",
                      height: "180px",
                      background: "rgba(30,41,59,0.85)",
                      color: "#fff",
                      fontSize: "2rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "18px"
                    }}
                  >
                    ขณะนี้ไม่มีฟังก์ชันให้บริการ
                  </div>
                )}
              </>
            ) : (
              // ถ้าระบบปิด แสดงข้อความเท่านั้น
              <div
                style={{
                  width: "100%",
                  height: "180px",
                  background: "rgba(30,41,59,0.85)",
                  color: "#fff",
                  fontSize: "2rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "18px"
                }}
              >
                ขณะนี้ระบบปิดให้บริการชั่วคราว
              </div>
            )}
          </div>

          <div className="status-section">
            <div className="status-card">
              <div className="status-header">
                <div className="status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </div>
                <h3>สถานะการแสดงผล</h3>
              </div>
              
              <div className="status-content">
                {order ? (
                  <div className="order-info">
                    <div className="queue-number">
                      <span className="queue-label">ลำดับของคุณ</span>
                      <span className="queue-value">#{order.queueNumber}</span>
                    </div>
                    <div className="order-details">
                      <span className="order-type">
                        {order.type === "image" ? "🖼️ รูปภาพ + ข้อความ" : "💬 ข้อความ"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="no-order">
                    <span className="no-order-icon">📋</span>
                    <span>ยังไม่มีการสั่งซื้อ</span>
                  </div>
                )}
              </div>
              
              <button className="status-btn" onClick={handleCheckStatus}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                ตรวจสอบสถานะ
              </button>
            </div>
          </div>
        </main>

        <footer className="home-footer">
          <div className="footer-content">
            <p>&copy; 2025 Digital Signage Content Management System</p>
            <div className="footer-links">
              <a href="#privacy">นโยบายความเป็นส่วนตัว</a>
              <a href="#terms">ข้อกำหนดการใช้งาน</a>
            </div>
          </div>
        </footer>

        {/* Status Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>รายละเอียดคำสั่งซื้อ</h3>
                <button className="close-button" onClick={handleCloseModal}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                {order ? (
                  <div className="order-summary">
                    <div className="summary-item">
                      <span className="item-label">ลำดับคิว:</span>
                      <span className="item-value queue-highlight">#{order.queueNumber}</span>
                    </div>
                    <div className="summary-item">
                      <span className="item-label">ประเภท:</span>
                      <span className="item-value">
                        {order.type === "image" ? "รูปภาพ + ข้อความ" : "ข้อความ"}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="item-label">ช่วงเวลาแสดง:</span>
                      <span className="item-value">{startTime} - {endTime} น.</span>
                    </div>
                    <div className="summary-item">
                      <span className="item-label">ราคา:</span>
                      <span className="item-value price-highlight">฿{order.price}</span>
                    </div>
                  </div>
                ) : (
                  <div className="no-order-modal">
                    <div className="empty-state">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 12h8"/>
                      </svg>
                      <h4>ไม่มีคำสั่งซื้อ</h4>
                      <p>คุณยังไม่มีการสั่งซื้อบริการ</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;