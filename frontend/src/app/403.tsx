export default function ForbiddenPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '3rem', color: '#d32f2f', marginBottom: '1rem' }}>403 Forbidden</h1>
      <p style={{ fontSize: '1.25rem', color: '#555' }}>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
    </div>
  );
}
