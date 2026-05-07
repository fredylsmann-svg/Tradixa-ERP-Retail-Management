import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function PublicTracker() {
  const { type, id } = useParams(); // type: 'open' atau 'click'
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('url');

  useEffect(() => {
    const trackActivity = async () => {
      if (!id) return;

      try {
        if (type === 'open') {
          // Update opened_count di marketing_campaigns
          const { data: campaign } = await supabase
            .from('marketing_campaigns')
            .select('opened_count')
            .eq('id', id)
            .single();
          
          await supabase
            .from('marketing_campaigns')
            .update({ opened_count: (campaign?.opened_count || 0) + 1 })
            .eq('id', id);
        } else if (type === 'click') {
          // Update clicked_count
          const { data: campaign } = await supabase
            .from('marketing_campaigns')
            .select('clicked_count')
            .eq('id', id)
            .single();

          await supabase
            .from('marketing_campaigns')
            .update({ clicked_count: (campaign?.clicked_count || 0) + 1 })
            .eq('id', id);

          // Redirect ke URL tujuan jika ada
          if (redirectUrl) {
            window.location.href = redirectUrl;
          }
        }
      } catch (err) {
        console.error('Tracking error:', err);
      }
    };

    trackActivity();
  }, [type, id, redirectUrl]);

  // Jika tipe 'open', tampilkan pixel transparan 1x1
  if (type === 'open') {
    return (
      <img 
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
        alt="" 
        style={{ width: '1px', height: '1px', opacity: 0 }} 
      />
    );
  }

  // Jika tipe 'click', tampilkan loading sebentar sebelum redirect
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-pulse text-slate-400 font-medium">Redirecting...</div>
    </div>
  );
}
