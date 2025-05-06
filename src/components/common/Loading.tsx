export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-blue-600 font-medium">Carregando...</p>
    </div>
  );
} 