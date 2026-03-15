import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { MessageSquare, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input, Button } from '@/components/ui';

export function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciais inválidas');
        return;
      }

      localStorage.setItem('chatflow_token', data.token);
      localStorage.setItem('chatflow_user', JSON.stringify(data.user));
      setLocation('/');
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Column - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative bg-sidebar overflow-hidden p-12">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent" />
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-lg shadow-primary/20">
            <MessageSquare className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="font-bold text-3xl text-white">ChatFlow</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            O hub central para o seu atendimento ao cliente.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg mb-8">
            Conecte todos os seus canais, colabore com sua equipe e entregue experiências incríveis aos seus clientes em um só lugar.
          </p>
          <div className="flex gap-4 items-center">
            <div className="flex -space-x-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-sidebar bg-primary/30 overflow-hidden flex items-center justify-center text-white text-xs font-bold">
                  {['AS','CM','JP','ML'][i-1]}
                </div>
              ))}
            </div>
            <p className="text-sm text-sidebar-foreground/60">
              Junte-se a <strong className="text-white">2.000+</strong> empresas.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-8">
               <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
                <MessageSquare className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-2">Insira seus dados para acessar sua conta.</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input 
              label="E-mail profissional" 
              type="email" 
              placeholder="nome@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            
            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-foreground">Senha</label>
                <a href="#" className="text-sm text-primary hover:underline font-medium">Esqueceu a senha?</a>
              </div>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full mt-6" isLoading={isLoading}>
              Entrar na plataforma
              {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Demo:</p>
            <p>Email: <span className="text-primary font-mono">admin@chatflow.com</span></p>
            <p>Senha: <span className="text-primary font-mono">admin123</span></p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?{' '}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Crie agora gratuitamente
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta');
        return;
      }

      localStorage.setItem('chatflow_token', data.token);
      localStorage.setItem('chatflow_user', JSON.stringify(data.user));
      setLocation('/');
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative bg-sidebar overflow-hidden p-12">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-lg shadow-primary/20">
            <MessageSquare className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="font-bold text-3xl text-white">ChatFlow</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Comece gratuitamente hoje mesmo.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg mb-8">
            Configure em minutos. Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
                <MessageSquare className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Criar conta</h2>
            <p className="text-muted-foreground mt-2">Preencha os dados abaixo para começar.</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <Input label="Nome completo" type="text" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="E-mail" type="email" placeholder="nome@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Senha" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />

            <Button type="submit" size="lg" className="w-full mt-6" isLoading={isLoading}>
              Criar conta gratuitamente
              {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
