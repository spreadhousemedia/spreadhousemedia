import { useLocation } from 'react-router-dom'

export function WhatsAppWidget() {
  const location = useLocation()

  // Do not render on administrative routes
  if (location.pathname.startsWith('/admin')) {
    return null
  }

  const phone = '919351042276'
  const message = encodeURIComponent(
    'Hi Spread NFC! I am interested in smart dynamic QR standees and NFC business cards. Please share details.'
  )
  const whatsappUrl = `https://wa.me/${phone}?text=${message}`

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp (+91 93510 42276)"
        className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-lg hover:shadow-xl hover:shadow-[#25D366]/40 hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white focus:outline-none"
      >
        {/* WhatsApp Icon */}
        <svg
          className="w-6 h-6 sm:w-7 sm:h-7 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.477-.15-.678.15-.2.301-.778.98-.954 1.18-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.799-1.5-1.786-1.676-2.087-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.101-.2.05-.376-.025-.526-.075-.15-.678-1.634-.929-2.237-.245-.588-.493-.508-.678-.518-.175-.01-.376-.01-.577-.01-.201 0-.527.075-.803.376s-1.054 1.029-1.054 2.509c0 1.48 1.08 2.909 1.23 3.109.15.201 2.126 3.246 5.15 4.553.719.311 1.281.497 1.719.636.723.23 1.381.197 1.901.12.58-.087 1.78-.728 2.031-1.431.251-.703.251-1.306.176-1.431-.076-.126-.277-.201-.578-.352zm-5.464 7.618c-1.808 0-3.578-.47-5.132-1.364l-.368-.211-3.816 1 1.018-3.719-.232-.38c-.979-1.603-1.496-3.447-1.496-5.326 0-5.522 4.49-10.013 10.02-10.013 2.674 0 5.187 1.042 7.077 2.934 1.89 1.892 2.93 4.407 2.929 7.083 0 5.523-4.49 10.013-10.02 10.013zm8.536-18.549c-2.279-2.28-5.31-3.538-8.536-3.538-6.654 0-12.072 5.417-12.072 12.07 0 2.126.554 4.2 1.607 6.024l-1.707 6.237 6.381-1.674c1.76 1 3.759 1.527 5.791 1.527 6.654 0 12.072-5.418 12.072-12.07 0-3.226-1.258-6.257-3.538-8.536z" />
        </svg>
      </a>
    </div>
  )
}
