interface PaymentSchema {
  currenciesAccepted: string
  paymentAccepted: string[]
}

/**
 * Transforms payment methods into schema properties
 *
 * @param payments - Array of payment method names (from apify_output.additionalInfo.Payments)
 * @returns Object with currenciesAccepted and paymentAccepted
 */
export function generatePaymentSchema(payments: string[] | null | undefined): PaymentSchema {
  // Always GBP for UK restaurants
  const currenciesAccepted = "GBP"

  // Default payment methods if no data
  const defaultPayments = ["Cash", "Credit Card", "Debit Card"]

  if (!payments || payments.length === 0) {
    return {
      currenciesAccepted,
      paymentAccepted: defaultPayments
    }
  }

  // Map payment strings from Apify data to standard formats
  const paymentAccepted: string[] = []

  for (const payment of payments) {
    // Handle both string and object formats
    let paymentStr: string
    if (typeof payment === 'string') {
      paymentStr = payment
    } else if (typeof payment === 'object' && payment !== null) {
      // If it's an object, get the first key (e.g., {"Credit cards": true})
      paymentStr = Object.keys(payment)[0] || ''
    } else {
      continue
    }

    const lower = paymentStr.toLowerCase()

    if (lower.includes('credit')) {
      if (!paymentAccepted.includes('Credit Card')) {
        paymentAccepted.push('Credit Card')
      }
    }

    if (lower.includes('debit')) {
      if (!paymentAccepted.includes('Debit Card')) {
        paymentAccepted.push('Debit Card')
      }
    }

    if (lower.includes('cash')) {
      if (!paymentAccepted.includes('Cash')) {
        paymentAccepted.push('Cash')
      }
    }

    // Add contactless for modern restaurants
    if (lower.includes('contactless') || lower.includes('nfc')) {
      if (!paymentAccepted.includes('Contactless')) {
        paymentAccepted.push('Contactless')
      }
    }
  }

  // If we found credit or debit cards, likely also supports contactless
  if ((paymentAccepted.includes('Credit Card') || paymentAccepted.includes('Debit Card')) && !paymentAccepted.includes('Contactless')) {
    paymentAccepted.push('Contactless')
  }

  // Fallback to default if nothing matched
  if (paymentAccepted.length === 0) {
    return {
      currenciesAccepted,
      paymentAccepted: defaultPayments
    }
  }

  return {
    currenciesAccepted,
    paymentAccepted
  }
}
