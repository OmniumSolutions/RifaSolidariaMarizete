
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Copy, Check, Gift } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

export default function RafflePage() {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [formData, setFormData] = useState({ name: '', whatsapp: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soldNumbers, setSoldNumbers] = useState<number[]>([]);
  const [raffleSettings, setRaffleSettings] = useState<{ status: string; winner: number | null } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<{ allowedQuantity: number; used: boolean } | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminQuantity, setAdminQuantity] = useState(1);

  const ADMIN_PASSWORD = "rifa-admin-2026";
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
  const progress = (soldNumbers.length / 100) * 100;

  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    
    const resQ = collection(db, 'reservations');
    const unsubRes = onSnapshot(resQ, (snapshot) => {
      const sold = snapshot.docs.map(doc => doc.data().number);
      setSoldNumbers(sold);
    });

    const settQ = doc(db, 'raffle_settings', 'status');
    const unsubSett = onSnapshot(settQ, (snapshot) => {
      if (snapshot.exists()) {
        setRaffleSettings(snapshot.data() as any);
      } else {
        setDoc(settQ, { status: 'open', winner: null });
      }
    });

    // Token validation
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);

    if (tokenParam) {
      getDoc(doc(db, 'access_tokens', tokenParam)).then(docSnap => {
        if (docSnap.exists() && docSnap.data().used !== true) {
          setIsValidToken(true);
          setTokenData(docSnap.data() as { allowedQuantity: number; used: boolean });
        } else {
          setIsValidToken(false);
        }
        setTokenLoading(false);
      });
    } else {
      setIsValidToken(false);
      setTokenLoading(false);
    }

    return () => {
      unsubRes();
      unsubSett();
    };
  }, []);

  const handleDraw = async () => {
    if (!isAdmin) {
      alert("Apenas o administrador pode realizar o sorteio.");
      return;
    }

    const availableNumbers = numbers.filter(n => !soldNumbers.includes(n));
    if (availableNumbers.length > 0) {
      alert("Ainda existem números disponíveis.");
      return;
    }

    const winner = soldNumbers[Math.floor(Math.random() * soldNumbers.length)];
    await updateDoc(doc(db, 'raffle_settings', 'status'), {
      status: 'drawn',
      winner,
      password: ADMIN_PASSWORD
    });
  };

  const handleNumberClick = (num: number) => {
    if (soldNumbers.includes(num) || raffleSettings?.status === 'drawn') return;
    
    if (isValidToken !== true) {
      alert("Token inválido ou já utilizado.");
      return;
    }

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < (tokenData?.allowedQuantity || 1)) {
      setSelectedNumbers([...selectedNumbers, num]);
    } else {
      alert(`Você já selecionou o limite de ${tokenData?.allowedQuantity} números.`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNumbers.length === 0) return;

    // Open WhatsApp immediately
    const message = `Olá! Acabei de reservar os números ${selectedNumbers.join(', ')} da rifa solidária da Marizete. Meu nome é ${formData.name}.`;
    const whatsappLink = `https://wa.me/5573991116235?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
    setIsModalOpen(false);
    setFormData({ name: '', whatsapp: '' });

    // Process Firebase reservation in background
    try {
      for (const number of selectedNumbers) {
        await addDoc(collection(db, 'reservations'), {
          number,
          name: formData.name,
          whatsapp: formData.whatsapp,
          timestamp: new Date()
        });
      }
      if (token) {
        await updateDoc(doc(db, 'access_tokens', token), { used: true });
      }
      setSelectedNumbers([]);
    } catch (error) {
      console.error("Erro ao salvar reserva no Firebase: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#2D3436] p-4 md:p-8">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E1DC] mb-8">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
            <Heart className="text-rose-500 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight uppercase">Rifa Solidária: Todos pela Marizete</h1>
            <p className="text-sm text-gray-500">Sorteio previsto para o dia 20/08 (após venda total)</p>
          </div>
        </div>
        <div className="bg-rose-500 text-white px-8 py-3 rounded-2xl flex flex-col items-center">
          <span className="text-xs uppercase font-bold tracking-widest opacity-80">Valor do Bilhete</span>
          <span className="text-2xl font-black">R$ 15,00</span>
        </div>
      </header>

      {isAdmin && (
        <div className="max-w-6xl mx-auto mb-8 text-center bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-bold mb-4">Painel Administrativo</h3>
            <div className="flex justify-center gap-4 items-center">
              <input type="number" value={adminQuantity} onChange={e => setAdminQuantity(parseInt(e.target.value))} className="border p-2 rounded w-20" />
              <button 
                onClick={async () => {
                  const newToken = Math.random().toString(36).substring(7);
                  await setDoc(doc(db, 'access_tokens', newToken), { used: false, allowedQuantity: adminQuantity });
                  const newLink = window.location.origin + "/?token=" + newToken;
                  copyToClipboard(newLink);
                  alert("Novo link copiado para a área de transferência!");
                }}
                className="bg-rose-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
              >
                Gerar Novo Link (Admin)
              </button>
            </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto mb-6 bg-white p-6 rounded-[24px] shadow-sm border border-[#E8E1DC]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-gray-700">Progresso da Rifa</span>
          <span className="text-sm font-bold text-rose-600">{progress}% Vendidos</span>
        </div>
        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-rose-500"
          />
        </div>
      </div>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 flex flex-col gap-6">
          <section className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E1DC]">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-rose-600">
              Nossa Luta
            </h2>
            <p className="text-sm leading-relaxed text-gray-600 mb-4">
              Marizete é uma guerreira que enfrenta simultaneamente a batalha contra o <strong>câncer</strong> e as sequelas de um <strong>AVC</strong>. Hoje, ela necessita de cuidados rigorosos e permanentes, incluindo o uso de bolsas de colostomia e insumos médicos de alto custo.
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-xs font-bold text-rose-800 uppercase mb-1">1º Prêmio</p>
                <p className="text-sm font-semibold">Kit de Beleza Completo (Boticário ou Natura)</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-800 uppercase mb-1">2º Prêmio</p>
                <p className="text-sm font-semibold">R$ 250,00 em Dinheiro</p>
              </div>
            </div>
          </section>

          <section className="bg-[#1E293B] text-white rounded-[24px] p-6 shadow-lg">
            <h2 className="text-sm font-bold uppercase tracking-widest text-rose-400 mb-4">Como Pagar</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase">Chave PIX (Telefone)</p>
                <div className="flex items-center justify-between">
                    <p className="text-lg font-mono font-bold text-white">73 99111-6235</p>
                    <button onClick={() => copyToClipboard('73991116235')} className="text-rose-400 hover:text-white">
                        {copied ? <Check size={16}/> : <Copy size={16}/>}
                    </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Chave PIX (Reserva)</p>
                <div className="flex items-center justify-between">
                    <p className="text-lg font-mono font-bold text-white">73 98206-6351</p>
                    <button onClick={() => copyToClipboard('73982066351')} className="text-rose-400 hover:text-white">
                        {copied ? <Check size={16}/> : <Copy size={16}/>}
                    </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="md:col-span-8 bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E1DC]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-gray-800">
              {raffleSettings?.status === 'drawn' 
                ? `Vencedor: ${raffleSettings.winner}` 
                : 'Escolha seu número (1 a 100)'
              }
            </h2>
            <div className="flex gap-4 text-xs">
              {raffleSettings?.status === 'open' && progress === 100 && (
                <button onClick={handleDraw} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-700">
                  <Gift size={16} /> Realizar Sorteio
                </button>
              )}
              {raffleSettings?.status === 'open' && (
                <span className="flex items-center gap-1 text-gray-400"><div className="w-3 h-3 bg-gray-100 rounded"></div> Livre</span>
              )}
              {selectedNumbers.length > 0 && (
                <button onClick={() => setIsModalOpen(true)} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold">
                  Finalizar ({selectedNumbers.length}/{tokenData?.allowedQuantity})
                </button>
              )}
            </div>
          </div>
          
          {tokenLoading ? (
            <p className="text-center">Carregando...</p>
          ) : (isValidToken === false && !isAdmin) ? (
            <div className="text-center p-8 bg-amber-50 rounded-lg">
              <p className="font-bold text-amber-800">Token inválido ou já utilizado!</p>
              <p className="text-sm text-amber-600">Por favor, entre em contato com o administrador para obter um novo link.</p>
              
              <button 
                onClick={() => {
                  localStorage.setItem('isAdmin', 'true');
                  setIsAdmin(true);
                  alert("Este dispositivo agora é um Administrador.");
                  window.location.reload();
                }}
                className="mt-4 bg-gray-800 text-white px-4 py-2 rounded font-bold"
              >
                Tornar este dispositivo Administrador
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {numbers.map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  disabled={soldNumbers.includes(num)}
                  className={`aspect-square border rounded-lg flex items-center justify-center font-bold transition-all ${
                    soldNumbers.includes(num)
                      ? 'bg-rose-100 text-rose-300 border-rose-100 cursor-not-allowed'
                      : selectedNumbers.includes(num)
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-gray-50 text-gray-700 border-gray-100 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  {num.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-6xl mx-auto mt-6 flex flex-col md:flex-row items-center justify-between px-8 py-4 bg-white rounded-[24px] border border-[#E8E1DC]">
        <div className="flex items-center gap-3 mb-2 md:mb-0">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Sistema de Reservas Ativo</span>
        </div>
        <p className="text-xs text-gray-400">Desenvolvido para apoio comunitário</p>
      </footer>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.form
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-2xl w-full max-w-sm"
            >
              <h3 className="text-lg font-bold mb-4">Confirmar {selectedNumbers.length} números: {selectedNumbers.join(', ')}</h3>
              <input
                required
                placeholder="Seu Nome"
                className="w-full p-2 border rounded mb-3"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <input
                required
                type="tel"
                placeholder="Seu WhatsApp"
                className="w-full p-2 border rounded mb-4"
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-2 bg-gray-200 rounded">Cancelar</button>
                <button type="submit" className="flex-1 p-2 bg-rose-600 text-white rounded">Confirmar</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
