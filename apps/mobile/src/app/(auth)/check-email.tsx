import { router, useLocalSearchParams } from 'expo-router';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { resendConfirmation } from '@/features/auth/api';
import { AuthTopBar } from '@/features/auth/components/auth-top-bar';
import { MailSentCard } from '@/features/auth/components/mail-sent-card';
import { useResend } from '@/features/auth/use-resend';

export default function CheckEmailScreen() {
  const { email = '', fresh } = useLocalSearchParams<{ email?: string; fresh?: string }>();
  const { resend, sending, waiting, label } = useResend(
    () => resendConfirmation(email),
    fresh !== '0',
  );

  function toLogin() {
    router.replace({ pathname: '/(auth)/login', params: { email } });
  }

  return (
    <AuthShell
      title="Kolla din mejl!"
      subtitle="Bekräfta din e-post så är kontot klart. Sen kan du logga in."
      top={<AuthTopBar onBack={toLogin} />}
      footer={
        <>
          <Button label="Till inloggning" onPress={toLogin} />
          <Button
            label={label}
            variant="ghost"
            loading={sending}
            disabled={waiting || !email}
            onPress={resend}
          />
        </>
      }
    >
      <MailSentCard email={email} action="Tryck på länken i mejlet på den här mobilen." />
    </AuthShell>
  );
}
