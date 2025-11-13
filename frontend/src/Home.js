import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [order, setOrder] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [isBirthday, setIsBirthday] = useState(null); // null = loading, true/false = checked
  const [status, setStatus] = useState({
    systemOn: true,
    imageOn: true,
    textOn: true,
    birthdayOn: true,
  });

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    setProfileImage(localStorage.getItem("avatar"));

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

  // Check birthday status when logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setIsBirthday(null);
      return;
    }

    const checkBirthdayStatus = async () => {
      try {
        const birthday = localStorage.getItem('birthday');
        if (!birthday) {
          setIsBirthday(false);
          return;
        }

        // Send birthday as query param to backend
        const response = await fetch(`http://localhost:4000/api/check-birthday?birthday=${encodeURIComponent(birthday)}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Birthday check result:", data);
          setIsBirthday(data.isBirthday);
        } else {
          setIsBirthday(false);
        }
      } catch (error) {
        console.error("Error checking birthday:", error);
        setIsBirthday(false);
      }
    };

    checkBirthdayStatus();
  }, [isLoggedIn]);

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

  // ปิดเมนูเมื่อคลิกนอกเมนู
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProfileMenu]);

  const handleSelect = (type) => {
    navigate(`/select?type=${type}`);
  };

  const handleCheckStatus = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    setShowProfileMenu(false);
    navigate("/");
    window.location.reload();
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
            <div style={{ position: "relative" }}>
              <button 
                className="profile-avatar-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title="ไปยังหน้าโปรไฟล์"
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: "2px solid #667eea",
                  background: profileImage ? undefined : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  backgroundImage: profileImage ? `url(${profileImage})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "24px",
                  transition: "all 0.3s ease",
                  padding: 0,
                  fontWeight: "500",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "scale(1.1)";
                  e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                }}
                onMouseLeave={(e) => {
                  if (!showProfileMenu) {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "none";
                  }
                }}
              >
                {!profileImage && (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                )}
              </button>

              {/* Profile Menu Dropdown */}
              {showProfileMenu && (
                <div
                  ref={profileMenuRef}
                  style={{
                    position: "absolute",
                    top: "50px",
                    right: 0,
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                    minWidth: "220px",
                    zIndex: 1000,
                    overflow: "hidden",
                  }}
                >
                  {/* Menu Header */}
                  <div
                    style={{
                      padding: "16px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: "600" }}>
                      {localStorage.getItem("username") || "ผู้ใช้"}
                    </div>
                    <div style={{ fontSize: "12px", opacity: 0.9 }}>
                      {localStorage.getItem("email") || "user@example.com"}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div>
                    {/* Edit Profile */}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/profile");
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: "#333",
                        fontSize: "14px",
                        transition: "background 0.2s",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                      onMouseEnter={(e) => (e.target.style.background = "#f5f5f5")}
                      onMouseLeave={(e) => (e.target.style.background = "transparent")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      แก้ไขโปรไฟล์
                    </button>

                    {/* Report Problem */}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/report");
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: "#333",
                        fontSize: "14px",
                        transition: "background 0.2s",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                      onMouseEnter={(e) => (e.target.style.background = "#f5f5f5")}
                      onMouseLeave={(e) => (e.target.style.background = "transparent")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      รายงานปัญหา
                    </button>

                    {/* Logout */}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: "#ef4444",
                        fontSize: "14px",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => (e.target.style.background = "#fee2e2")}
                      onMouseLeave={(e) => (e.target.style.background = "transparent")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                      // ปิด click เลยถ้าไม่ใช่วันเกิด หรือไม่ logged in
                      if (!isLoggedIn || isBirthday === false) {
                        return;
                      }
                      
                      // ถ้าเป็นวันเกิด - ไปหน้า upload ฟรี
                      if (isBirthday === true) {
                        navigate("/upload?type=birthday&free=true");
                        return;
                      }
                    }}
                    style={{
                      cursor: isBirthday === false || !isLoggedIn ? "not-allowed" : "pointer",
                      pointerEvents: isBirthday === false || !isLoggedIn ? "none" : "auto",
                      background: isBirthday === false || !isLoggedIn ? "linear-gradient(90deg, #cbd5e0 0%, #a0aec0 100%)" : "linear-gradient(90deg, #fbbf24 0%, #f472b6 100%)",
                      color: "#fff",
                      boxShadow: isBirthday === false || !isLoggedIn ? "none" : "0 2px 12px rgba(30,41,59,0.08)",
                      opacity: isBirthday === false || !isLoggedIn ? 0.6 : 1,
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