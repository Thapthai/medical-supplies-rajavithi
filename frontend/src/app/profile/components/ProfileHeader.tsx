interface ProfileHeaderProps {
  userName?: string;
}

export default function ProfileHeader({ userName }: ProfileHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ตั้งค่าโปรไฟล์</h1>
      <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
        จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ
        {userName && ` - ${userName}`}
      </p>
    </div>
  );
}

