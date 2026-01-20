import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  status: string;
  provider: string | null;
  payout_method: string | null;
  phone_number: string | null;
  reference: string | null;
  description: string | null;
  created_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to get existing wallet
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      // If no wallet exists, create one
      if (!walletData) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: user.id, currency: 'XOF' })
          .select()
          .single();

        if (createError) throw createError;
        walletData = newWallet;
      }

      setWallet(walletData);

      // Fetch transactions
      if (walletData) {
        const { data: txData, error: txError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (txError) throw txError;
        setTransactions(txData || []);
      }
    } catch (err: any) {
      console.error('Error fetching wallet:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!wallet) return;

    const walletChannel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `id=eq.${wallet.id}`
        },
        (payload) => {
          console.log('Wallet update:', payload);
          if (payload.new) {
            setWallet(payload.new as Wallet);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `wallet_id=eq.${wallet.id}`
        },
        (payload) => {
          console.log('Transaction update:', payload);
          fetchWallet(); // Refresh transactions
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
    };
  }, [wallet?.id]);

  const requestWithdrawal = async (
    amount: number,
    phoneNumber: string,
    payoutMethod: 'wave' | 'orange_money'
  ) => {
    if (!wallet || !user) {
      throw new Error('Portefeuille non disponible');
    }

    if (amount > wallet.balance) {
      throw new Error('Solde insuffisant');
    }

    if (amount < 500) {
      throw new Error('Montant minimum: 500 XOF');
    }

    const { data, error } = await supabase.functions.invoke('request-withdrawal', {
      body: {
        walletId: wallet.id,
        amount,
        phoneNumber,
        payoutMethod,
        userId: user.id
      }
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);

    // Refresh wallet data
    await fetchWallet();

    return data;
  };

  return {
    wallet,
    transactions,
    isLoading,
    error,
    requestWithdrawal,
    refetch: fetchWallet
  };
}
