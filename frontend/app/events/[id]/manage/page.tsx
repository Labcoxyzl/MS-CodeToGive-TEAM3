"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Sidebar from "@/app/components/ui/Sidebar";
import styles from "@/app/dashboard/dashboard.module.css";

export default function ManageEventPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pre" | "during" | "post">("during");

  const volunteers = [1, 2, 3, 4];
  const clusters = ['A', 'B', 'C'];
  
  const clusterColors = [
    "var(--lt-teal)",  
    "var(--lt-purple)", 
    "var(--lt-coral)" 
  ];

  return (
    <div className="lt-page" style={{ flexDirection: "row", alignItems: "stretch" }}>
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.dashboardMain}>
        
        <div className={styles.topBar}>
          <button className="lt-sidebar-toggle lg:hidden" onClick={() => setSidebarOpen(true)} style={{ position: "static", display: "flex", width: "40px", height: "40px" }}>
            ☰
          </button>
          
          <Link href="/" className="lt-header__logo">
            <span>
              <Image src="/logo.svg" alt="Lemontree Icon" width={32} height={32} priority />
              <Image src="/lemontree_text_logo.svg" alt="Lemontree" width={112} height={24} priority />
            </span>
          </Link>

          <div className={styles.topBarUser}>
            <div className="lt-avatar" style={{ border: "2px solid rgba(0,0,0,0.1)", width: "32px", height: "32px", fontSize: "14px" }}>U</div>
            <span className="hidden sm:inline">User</span>
          </div>
        </div>

        <div className={styles.dashboardContent}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
            <div>
              <h1 className="lt-section-title" style={{ fontSize: "32px", margin: 0 }}>Event1</h1>
              {activeTab !== "pre" && <p style={{ color: "var(--lt-text-secondary)", fontSize: "15px", marginTop: "8px", fontWeight: 500 }}>Volunteers Status (6/8)</p>}
            </div>
            
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setActiveTab("pre")} style={{ padding: "8px 24px", borderRadius: "var(--lt-radius-full)", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", transition: "var(--lt-transition)", backgroundColor: activeTab === "pre" ? "var(--lt-text-primary)" : "var(--lt-card-bg-muted)", color: activeTab === "pre" ? "white" : "var(--lt-text-secondary)" }}>Pre-event</button>
              <button onClick={() => setActiveTab("during")} style={{ padding: "8px 24px", borderRadius: "var(--lt-radius-full)", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", transition: "var(--lt-transition)", backgroundColor: activeTab === "during" ? "var(--lt-text-primary)" : "var(--lt-card-bg-muted)", color: activeTab === "during" ? "white" : "var(--lt-text-secondary)" }}>During event</button>
              <button onClick={() => setActiveTab("post")} style={{ padding: "8px 24px", borderRadius: "var(--lt-radius-full)", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", transition: "var(--lt-transition)", backgroundColor: activeTab === "post" ? "var(--lt-text-primary)" : "var(--lt-card-bg-muted)", color: activeTab === "post" ? "white" : "var(--lt-text-secondary)" }}>Post-event</button>
            </div>
          </div>

          {activeTab === "pre" && (
            <div className="animate-fade-in">
              <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
                <div style={{ backgroundColor: "var(--lt-card-bg-muted)", padding: "12px 24px", borderRadius: "var(--lt-radius-full)", display: "flex", alignItems: "center", gap: "12px", fontSize: "15px", fontWeight: 600, color: "var(--lt-text-primary)" }}>
                  Event Open
                  <div style={{ width: "40px", height: "24px", backgroundColor: "var(--lt-text-muted)", borderRadius: "var(--lt-radius-full)", display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "2px 3px" }}><div style={{ width: "18px", height: "18px", backgroundColor: "white", borderRadius: "50%" }}></div></div>
                </div>
                <div className="lt-btn" style={{ borderRadius: "var(--lt-radius-full)", padding: "12px 24px", backgroundColor: "var(--lt-card-bg-muted)", color: "var(--lt-text-primary)" }}>
                  Edit Event ✎
                </div>
                <div style={{ flex: 1, backgroundColor: "var(--lt-card-bg-muted)", padding: "12px 24px", borderRadius: "var(--lt-radius-full)", color: "var(--lt-text-muted)", fontSize: "15px", display: "flex", alignItems: "center" }}>
                  Send Message...
                </div>
              </div>
              <div style={{ display: "flex", gap: "32px" }}>
                <div style={{ width: "55%" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--lt-text-primary)" }}>Volunteers (6/8)</h2>
                  <div style={{ backgroundColor: "var(--lt-card-bg-muted)", borderRadius: "var(--lt-radius-md)", padding: "16px 24px" }}>
                    {volunteers.map((i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: i === 4 ? "none" : "1px solid var(--lt-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div className="lt-avatar lt-avatar--sm" style={{ backgroundColor: "rgba(0,0,0,0.05)", background: "none", border: "2px solid var(--lt-border)", color: "var(--lt-text-muted)" }}>FL</div>
                          <span style={{ fontSize: "15px", color: "var(--lt-text-primary)", fontWeight: 500 }}>FirstName L.</span>
                        </div>
                        <span style={{ fontSize: "15px", color: "var(--lt-text-secondary)" }}>XXXX</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ width: "45%", display: "flex", flexDirection: "column" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--lt-text-primary)" }}>Team Clusters</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "var(--lt-card-bg-muted)", padding: "24px", borderRadius: "var(--lt-radius-md)" }}>
                    {clusters.map((group, index) => (
                      <div key={group} style={{ padding: "16px 20px", borderRadius: "var(--lt-radius-sm)", backgroundColor: clusterColors[index % clusterColors.length], color: "white" }}>
                        <p style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 600 }}>Group {group}: Location</p>
                        <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>Participant A, Participant B...</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "during" && (
            <div className="animate-fade-in" style={{ display: "flex", gap: "32px" }}>
              <div style={{ width: "55%" }}>
                <div style={{ backgroundColor: "var(--lt-card-bg-muted)", borderRadius: "var(--lt-radius-md)", padding: "16px 24px" }}>
                  {volunteers.map((i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: i === 4 ? "none" : "1px solid var(--lt-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div className="lt-avatar lt-avatar--sm" style={{ backgroundColor: "rgba(0,0,0,0.05)", background: "none", border: "2px solid var(--lt-border)", color: "var(--lt-text-muted)" }}>FL</div>
                        <span style={{ fontSize: "15px", color: "var(--lt-text-primary)", fontWeight: 500 }}>FirstName L.</span>
                      </div>
                      <span className={`lt-badge ${i % 2 !== 0 ? "lt-badge--completed" : ""}`} style={i % 2 === 0 ? { color: "var(--lt-text-secondary)" } : {}}>
                        {i % 2 !== 0 ? "Checked In" : "Absent"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ width: "45%", display: "flex", flexDirection: "column" }}>
                <div style={{ backgroundColor: "var(--lt-card-bg-muted)", padding: "16px 24px", borderRadius: "var(--lt-radius-full)", marginBottom: "32px", color: "var(--lt-text-muted)", fontSize: "15px" }}>Send Message...</div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--lt-text-primary)" }}>Team Clusters</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "var(--lt-card-bg-muted)", padding: "24px", borderRadius: "var(--lt-radius-md)" }}>
                  {clusters.map((group, index) => (
                    <div key={group} style={{ padding: "16px 20px", borderRadius: "var(--lt-radius-sm)", backgroundColor: clusterColors[index % clusterColors.length], color: "white" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 600 }}>Group {group}: Location</p>
                      <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>Participant A, Participant B...</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "post" && (
            <div className="animate-fade-in" style={{ display: "flex", gap: "32px" }}>
              <div style={{ width: "55%" }}>
                <div style={{ backgroundColor: "var(--lt-card-bg-muted)", borderRadius: "var(--lt-radius-md)", padding: "16px 24px", marginBottom: "32px" }}>
                  {volunteers.map((i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: i === 4 ? "none" : "1px solid var(--lt-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div className="lt-avatar lt-avatar--sm" style={{ backgroundColor: "rgba(0,0,0,0.05)", background: "none", border: "2px solid var(--lt-border)", color: "var(--lt-text-muted)" }}>FL</div>
                        <span style={{ fontSize: "15px", color: "var(--lt-text-primary)", fontWeight: 500 }}>FirstName L.</span>
                      </div>
                      <span className={`lt-badge ${i !== 2 ? "lt-badge--completed" : ""}`} style={i === 2 ? { backgroundColor: "var(--lt-error-bg)", color: "var(--lt-error)" } : {}}>
                        {i === 2 ? "Not Checked In" : "Checked In"}
                      </span>
                    </div>
                  ))}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--lt-text-primary)" }}>Team Clusters</h3>
                <div style={{ padding: "24px", borderRadius: "var(--lt-radius-md)", backgroundColor: "var(--lt-card-bg-muted)" }}>
                  <div style={{ padding: "16px 20px", borderRadius: "var(--lt-radius-sm)", backgroundColor: clusterColors[0], color: "white" }}>
                    <p style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 600 }}>Group A: Location</p>
                    <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>Participant A, Participant B...</p>
                  </div>
                </div>
              </div>
              <div style={{ width: "45%", display: "flex", flexDirection: "column" }}>
                <div style={{ backgroundColor: "var(--lt-card-bg-muted)", padding: "16px 24px", borderRadius: "var(--lt-radius-full)", marginBottom: "32px", color: "var(--lt-text-muted)", fontSize: "15px" }}>Send Message...</div>
                
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--lt-text-primary)" }}>Showcase your Service:</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "var(--lt-card-bg-muted)", padding: "24px", borderRadius: "var(--lt-radius-md)" }}>
                  <div style={{ backgroundColor: "var(--lt-teal-light)", color: "var(--lt-teal)", border: "1px solid var(--lt-border-focus)", padding: "16px 20px", borderRadius: "var(--lt-radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "15px", cursor: "pointer" }}>
                    <span style={{ fontWeight: 600 }}>Upload Photos</span><span className="lt-badge lt-badge--active">+5</span>
                  </div>
                  <div style={{ backgroundColor: "var(--lt-purple-light)", color: "var(--lt-purple)", padding: "16px 20px", borderRadius: "var(--lt-radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "15px", cursor: "pointer" }}>
                    <span style={{ fontWeight: 600 }}>Post on Social Media</span><span className="lt-badge lt-badge--active">+5</span>
                  </div>
                  <div style={{ backgroundColor: "var(--lt-card-bg-white)", color: "var(--lt-text-primary)", border: "1px solid var(--lt-border)", padding: "16px 20px", borderRadius: "var(--lt-radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "15px", cursor: "pointer" }}>
                    <span style={{ fontWeight: 600 }}>Reflect on your experience</span><span className="lt-badge lt-badge--active">+5</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}