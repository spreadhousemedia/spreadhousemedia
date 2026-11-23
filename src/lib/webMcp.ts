interface WebMcpToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

interface ModelContextNavigator {
  modelContext?: {
    registerTool?: (tool: WebMcpToolDefinition) => void
  }
}

export function registerWebMcpTools(): void {
  if (typeof window === 'undefined') return
  const nav = navigator as unknown as ModelContextNavigator
  const register = nav?.modelContext?.registerTool
  if (typeof register !== 'function') return

  try {
    register.call(nav.modelContext, {
      name: 'lookup_qr_status',
      description: 'Check whether a Spread NFC QR serial number (e.g. TF-1001) exists and its activation status.',
      inputSchema: {
        type: 'object',
        required: ['qr_number'],
        properties: {
          qr_number: { type: 'string', description: 'QR serial number printed on the card or standee' },
        },
      },
      execute: async (args) => {
        const qrNumber = String(args.qr_number || '').trim().toUpperCase()
        const res = await fetch('/api/rpc/request_qr_update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_qr_number: qrNumber }),
        })
        return res.json()
      },
    })

    register.call(nav.modelContext, {
      name: 'list_nfc_products',
      description: 'List active Spread NFC smart cards, standees, and tags with pricing and specifications.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['all', 'cards', 'standees', 'tags'] },
        },
      },
      execute: async (args) => {
        const res = await fetch('/api/rpc/get_public_products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_category: args.category ? String(args.category) : null }),
        })
        return res.json()
      },
    })

    register.call(nav.modelContext, {
      name: 'get_public_profile',
      description: 'Fetch a published Spread NFC Personal or Business digital profile by handle or QR number.',
      inputSchema: {
        type: 'object',
        required: ['identifier'],
        properties: {
          identifier: { type: 'string', description: 'Custom profile handle or QR serial number' },
        },
      },
      execute: async (args) => {
        const res = await fetch('/api/rpc/get_public_profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_identifier: String(args.identifier || '').trim() }),
        })
        return res.json()
      },
    })
  } catch {
    // Ignore if browser modelContext throws on unsupported contexts
  }
}

