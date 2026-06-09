const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// ── 1. Replace calculatedFinalPrice and append Return & Exchange states ──
const oldFinalPriceBlock = `  const calculatedFinalPrice = useMemo(() => {
    const dep = Number(depositAmount) || 0;
    if (saleType === 'transfer' || saleType === 'cash') {
      return dep + (Number(transferAmount) || 0);
    } else if (saleType === 'cod') {
      return dep + (Number(codAmountInput) || 0);
    } else if (saleType === 'installment') {
      return dep + (Number(instMonths) || 0) * (Number(instMonthlyPayment) || 0);
    } else if (saleType === 'exchange') {
      return dep + (Number(tradeInValue) || 0);
    }
    return 0;
  }, [saleType, depositAmount, transferAmount, codAmountInput, instMonths, instMonthlyPayment, tradeInValue]);`;

const newFinalPriceBlock = `  // ── Return / Restore Modal States (Sales tab) ──────────────────────────
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnDeviceIds, setReturnDeviceIds] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<'simple' | 'defect'>('simple');
  const [returnNotes, setReturnNotes] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);

  // ── Exchange / Swap States (Sell Modal) ─────────────────────────────
  const [exchangeReturnedDeviceId, setExchangeReturnedDeviceId] = useState('');
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState('');
  const [exchangeMode, setExchangeMode] = useState<'even' | 'upgrade' | 'downgrade'>('even');
  const [exchangeCashDiff, setExchangeCashDiff] = useState<number | string>(0);
  const [exchangeMemo, setExchangeMemo] = useState('');

  const calculatedFinalPrice = useMemo(() => {
    const dep = Number(depositAmount) || 0;
    if (saleType === 'transfer' || saleType === 'cash') {
      return dep + (Number(transferAmount) || 0);
    } else if (saleType === 'cod') {
      return dep + (Number(codAmountInput) || 0);
    } else if (saleType === 'installment') {
      return dep + (Number(instMonths) || 0) * (Number(instMonthlyPayment) || 0);
    } else if (saleType === 'exchange') {
      if (exchangeReturnedDeviceId) {
        const returnedDev = devices.find(d => d.id === exchangeReturnedDeviceId);
        const basePrice = returnedDev?.selling_price || 0;
        const diff = Number(exchangeCashDiff) || 0;
        if (exchangeMode === 'upgrade') {
          return basePrice + diff;
        } else if (exchangeMode === 'downgrade') {
          return basePrice - diff;
        } else {
          return basePrice;
        }
      }
      return dep + (Number(tradeInValue) || 0);
    }
    return 0;
  }, [saleType, depositAmount, transferAmount, codAmountInput, instMonths, instMonthlyPayment, tradeInValue, exchangeReturnedDeviceId, exchangeMode, exchangeCashDiff, devices]);`;

// ── 2. Update getSaleDetailsLabel to handle exchanges dynamically ──
const oldDetailsLabelBlock = `    } else if (type === 'exchange') {
      return \`기기 맞교환 (추가 수금 ฿\${formatPrice(dep)})\`;
    }`;

const newDetailsLabelBlock = `    } else if (type === 'exchange') {
      if (dep > 0) {
        return \`기기 교환 (추가 수금 ฿\${formatPrice(dep)})\`;
      } else if (dep < 0) {
        return \`기기 교환 (차액 환불 ฿\${formatPrice(Math.abs(dep))})\`;
      } else {
        return \`기기 맞교환\`;
      }
    }`;

let success = true;

if (content.includes(oldFinalPriceBlock)) {
  content = content.replace(oldFinalPriceBlock, newFinalPriceBlock);
  console.log('✅ Replaced calculatedFinalPrice & added states');
} else {
  console.log('❌ Failed to find calculatedFinalPrice block');
  success = false;
}

if (content.includes(oldDetailsLabelBlock)) {
  content = content.replace(oldDetailsLabelBlock, newDetailsLabelBlock);
  console.log('✅ Updated getSaleDetailsLabel');
} else {
  console.log('❌ Failed to find getSaleDetailsLabel block');
  success = false;
}

if (success) {
  // Convert back to CRLF format
  const finalContent = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('src/app/staff/dashboard/page.tsx', finalContent, 'utf8');
  console.log('🎉 States and helper updates applied successfully!');
} else {
  console.log('⚠️ Aborted. Please check the mismatches.');
}
