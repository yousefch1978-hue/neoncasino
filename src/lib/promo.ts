import { supabase } from './supabase';

export type PromoRedeemContext = 'signup' | 'redeem';
export type PromoRedeemType = 'signup_only' | 'redeem_only' | 'both';

export function getOrCreatePromoDeviceId() {
  const deviceKey = 'promo-device-id';
  let deviceId = localStorage.getItem(deviceKey);

  if (!deviceId) {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');

    deviceId = btoa(fingerprint);
    localStorage.setItem(deviceKey, deviceId);
  }

  return deviceId;
}

export async function redeemPromoCodeDb(
  userId: string,
  code: string,
  context: PromoRedeemContext
) {
  const deviceId = getOrCreatePromoDeviceId();

  const { data, error } = await supabase.rpc('redeem_promo_code', {
    profile_id: userId,
    promo_code_text: code.trim().toUpperCase(),
    redeem_context: context,
    device_id_text: deviceId,
  });

  if (error) throw error;
  return data as {
    success: boolean;
    error?: string;
    amount?: number;
    new_balance?: number;
  };
}

export async function fetchPromoCodesDb() {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPromoCodeDb(
  code: string,
  amount: number,
  uses: number,
  createdBy: string,
  redeemType: PromoRedeemType = 'both'
) {
  const payload = {
    code: code.trim().toUpperCase(),
    amount,
    uses_left: uses,
    total_uses: uses,
    created_by: createdBy,
    redeem_type: redeemType,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('promo_codes')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deletePromoCodeDb(codeId: string) {
  const { error } = await supabase
    .from('promo_codes')
    .delete()
    .eq('id', codeId);

  if (error) throw error;
}
