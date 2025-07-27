const Header = () => {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            AI Case Management System
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Welcome, Case Manager
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;