import React, { useState, useEffect } from 'react';
import './App.css';
import { Plus, X, Upload, DollarSign, FileImage } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [accounts, setAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newAccount, setNewAccount] = useState({
    title: '',
    description: '',
    price: '',
    image: null
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('שגיאה בטעינת החשבונות');
    }
  };

  const verifyCode = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/verify-code`, { code: accessCode });
      if (response.data.valid) {
        setIsCodeVerified(true);
        setShowCodeModal(false);
        setShowAddModal(true);
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('שגיאה באימות הקוד');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.title || !newAccount.description || !newAccount.price) {
      toast.error('יש למלא את כל השדות הנדרשים');
      return;
    }

    const formData = new FormData();
    formData.append('title', newAccount.title);
    formData.append('description', newAccount.description);
    formData.append('price', newAccount.price);
    formData.append('access_code', accessCode);
    if (newAccount.image) {
      formData.append('image', newAccount.image);
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API}/accounts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowAddModal(false);
        setNewAccount({ title: '', description: '', price: '', image: null });
        setAccessCode('');
        setIsCodeVerified(false);
        fetchAccounts();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'שגיאה בהוספת החשבון');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="text-center py-12">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          Frozen Shop
        </h1>
        <p className="text-xl text-gray-300">משתמשים למחירה</p>
      </header>

      {/* Accounts Grid */}
      <main className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {accounts.map((account) => (
            <div 
              key={account.id} 
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden hover:transform hover:scale-105 transition-all duration-300 shadow-2xl"
            >
              {/* Account Image */}
              <div className="relative h-48 bg-gradient-to-br from-gray-700 to-gray-800">
                {account.image_data ? (
                  <img 
                    src={account.image_data} 
                    alt={account.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage className="w-16 h-16 text-gray-500" />
                  </div>
                )}
                {/* Sale Badge */}
                <div className="absolute top-3 left-3 bg-cyan-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                  מכירה
                </div>
              </div>

              {/* Account Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-white">{account.title}</h3>
                <p className="text-gray-400 mb-1 flex items-center gap-2">
                  <span>{account.seller}</span>
                </p>
                <p className="text-gray-400 mb-4 text-sm">
                  {formatDate(account.created_at)}
                </p>
                
                <div className="text-3xl font-bold text-cyan-400 mb-4">
                  {formatPrice(account.price)}
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-pink-500/25"
                  data-testid={`buy-account-${account.id}`}
                >
                  קנה עכשיו
                </Button>
              </div>
            </div>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-20">
            <FileImage className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">אין חשבונות זמינים כרגע</p>
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <Button
        onClick={() => setShowCodeModal(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-cyan-500 hover:bg-cyan-600 text-black rounded-full shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 z-50"
        data-testid="add-account-btn"
      >
        <Plus className="w-8 h-8" />
      </Button>

      {/* Code Verification Modal */}
      <Dialog open={showCodeModal} onOpenChange={setShowCodeModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">הזן קוד גישה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="access-code">קוד גישה</Label>
              <Input
                id="access-code"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="הזן קוד גישה..."
                data-testid="access-code-input"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowCodeModal(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                ביטול
              </Button>
              <Button 
                onClick={verifyCode}
                disabled={loading || !accessCode}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black"
                data-testid="verify-code-btn"
              >
                {loading ? 'בודק...' : 'אמת קוד'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">הוסף חשבון חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">כותרת החשבון</Label>
              <Input
                id="title"
                type="text"
                value={newAccount.title}
                onChange={(e) => setNewAccount({...newAccount, title: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="לדוגמה: Premium Fortnite Account"
                data-testid="account-title-input"
              />
            </div>
            
            <div>
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={newAccount.description}
                onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="תאר את החשבון..."
                rows={3}
                data-testid="account-description-input"
              />
            </div>
            
            <div>
              <Label htmlFor="price">מחיר ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newAccount.price}
                onChange={(e) => setNewAccount({...newAccount, price: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="99.99"
                data-testid="account-price-input"
              />
            </div>
            
            <div>
              <Label htmlFor="image">תמונה</Label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setNewAccount({...newAccount, image: e.target.files[0]})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-black hover:file:bg-cyan-600"
                data-testid="account-image-input"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setShowAddModal(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                ביטול
              </Button>
              <Button 
                onClick={handleAddAccount}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                data-testid="submit-account-btn"
              >
                {loading ? 'מוסיף...' : 'הוסף חשבון'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;