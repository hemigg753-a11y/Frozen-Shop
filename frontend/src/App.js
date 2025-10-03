import React, { useState, useEffect } from 'react';
import './App.css';
import { Plus, X, Upload, DollarSign, FileImage, Trash2, MessageCircle, Send, LogOut, User } from 'lucide-react';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
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
    if (isLoggedIn) {
      fetchAccounts();
      fetchChatMessages();
    }
  }, [isLoggedIn]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('שגיאה בטעינת החשבונות');
    }
  };

  const fetchChatMessages = async () => {
    try {
      const response = await axios.get(`${API}/chat/messages`);
      const allMessages = response.data;
      
      if (isAdmin) {
        // Group messages by user for admin
        const grouped = groupMessagesByUser(allMessages);
        setConversations(grouped);
      } else {
        // Show only messages for this user
        const userMessages = allMessages.filter(
          msg => msg.sender_email === userEmail || msg.is_admin
        );
        setChatMessages(userMessages);
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  const groupMessagesByUser = (messages) => {
    const groups = {};
    
    messages.forEach(msg => {
      const userEmail = msg.is_admin ? 'admin' : msg.sender_email;
      if (userEmail !== 'admin') {
        if (!groups[userEmail]) {
          groups[userEmail] = {
            userEmail: userEmail,
            messages: [],
            lastMessage: null,
            unreadCount: 0
          };
        }
        groups[userEmail].messages.push(msg);
        groups[userEmail].lastMessage = msg;
      }
    });
    
    return Object.values(groups).sort(
      (a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );
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

  const handlePurchase = (account) => {
    setSelectedAccount(account);
    setShowPurchaseModal(true);
  };

  const handlePurchaseSubmit = () => {
    toast.success('תשלום בוצע בהצלחה! פרטי החשבון נשלחו אליך במייל');
    setShowPurchaseModal(false);
    setSelectedAccount(null);
  };

  const handleDeleteAccount = (account) => {
    setSelectedAccount(account);
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (deleteCode !== 'ALON123GG1') {
      toast.error('קוד מחיקה שגוי!');
      return;
    }

    try {
      const response = await axios.delete(`${API}/accounts/${selectedAccount.id}`);
      if (response.data.success) {
        toast.success('החשבון נמחק בהצלחה');
        setShowDeleteModal(false);
        setDeleteCode('');
        setSelectedAccount(null);
        fetchAccounts();
      }
    } catch (error) {
      toast.error('שגיאה במחיקת החשבון');
    }
  };

  const handleLogin = () => {
    if (!loginEmail || !loginEmail.includes('@')) {
      toast.error('אנא הזן כתובת אימייל תקינה');
      return;
    }

    setUserEmail(loginEmail);
    setIsLoggedIn(true);
    
    // Check if admin
    if (loginEmail === 'lagzielalon81@gmail.com') {
      setIsAdmin(true);
      toast.success('התחברת כאדמין!');
    } else {
      setIsAdmin(false);
      toast.success('התחברת בהצלחה!');
    }
    
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setUserEmail('');
    setIsLoggedIn(false);
    setIsAdmin(false);
    setLoginEmail('');
    setShowLoginModal(true);
    toast.success('התנתקת בהצלחה');
  };

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      try {
        const messageData = {
          sender_email: isAdmin && activeConversation ? activeConversation.userEmail : userEmail,
          message: newMessage,
          is_admin: isAdmin
        };
        
        await axios.post(`${API}/chat/messages`, messageData);
        setNewMessage('');
        
        // Refresh messages
        fetchChatMessages();
        
        if (!isAdmin) {
          toast.success(`ההודעה נשלחה לאדמין: lagzielalon81@gmail.com`);
        } else {
          toast.success('ההודעה נשלחה');
        }
      } catch (error) {
        toast.error('שגיאה בשליחת ההודעה');
      }
    }
  };

  const openConversation = (conversation) => {
    setActiveConversation(conversation);
    // Filter messages for this specific user
    const conversationMessages = conversation.messages.concat(
      chatMessages.filter(msg => 
        msg.sender_email === conversation.userEmail && msg.is_admin
      )
    );
    setChatMessages(conversationMessages);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <Toaster position="top-center" richColors />
      
      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={() => {}}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Frozen Shop
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-300 mb-4">התחבר עם כתובת האימייל שלך</p>
            </div>
            
            <div>
              <Label htmlFor="login-email">כתובת אימייל</Label>
              <Input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="your@email.com"
                data-testid="login-email-input"
              />
            </div>
            
            <Button 
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3"
              data-testid="login-btn"
            >
              התחבר
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content - Only shown after login */}
      {isLoggedIn && (
        <>
      
      {/* Header */}
      <header className="py-12 relative">
        {/* User Info */}
        {isLoggedIn && (
          <div className="absolute top-4 right-6 flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                {userEmail}
              </div>
              {isAdmin && (
                <div className="text-xs text-cyan-400 font-semibold">אדמין</div>
              )}
            </div>
            <Button
              onClick={handleLogout}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              title="התנתק"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Frozen Shop
          </h1>
          <p className="text-xl text-gray-300">משתמשים למחירה</p>
        </div>
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
                
                {/* Delete Button - Only for admin */}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(account);
                    }}
                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all duration-200 opacity-80 hover:opacity-100"
                    data-testid={`delete-account-${account.id}`}
                    title="מחק חשבון"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
                  onClick={() => handlePurchase(account)}
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

      {/* Floating Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
        {/* Chat Button - Available to all users */}
        <Button
          onClick={() => setShowChatModal(true)}
          className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/25 transition-all duration-300"
          data-testid="chat-btn"
        >
          <MessageCircle className="w-8 h-8" />
        </Button>
        
        {/* Add Button - Only for admin */}
        {isAdmin && (
          <Button
            onClick={() => setShowCodeModal(true)}
            className="w-16 h-16 bg-cyan-500 hover:bg-cyan-600 text-black rounded-full shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300"
            data-testid="add-account-btn"
          >
            <Plus className="w-8 h-8" />
          </Button>
        )}
      </div>

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

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">רכישת חשבון</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-6">
              {/* Account Info */}
              <div className="text-center border-b border-gray-600 pb-4">
                <h3 className="text-lg font-bold text-white mb-2">{selectedAccount.title}</h3>
                <div className="text-2xl font-bold text-cyan-400">{formatPrice(selectedAccount.price)}</div>
              </div>
              
              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">כתובת אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="your@email.com"
                    data-testid="purchase-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="payment-method">אמצעי תשלום</Label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    data-testid="payment-method"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="crypto">מטבע דיגיטלי</option>
                    <option value="bank">העברה בנקאית</option>
                  </select>
                </div>
                
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">מה תקבל:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• פרטי התחברות לחשבון</li>
                    <li>• אימייל עם כל הפרטים</li>
                    <li>• תמיכה 24/7</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowPurchaseModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  ביטול
                </Button>
                <Button 
                  onClick={handlePurchaseSubmit}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold"
                  data-testid="complete-purchase-btn"
                >
                  השלם רכישה
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center text-red-400">מחיקת חשבון</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="text-center border-b border-gray-600 pb-4">
                <h3 className="text-lg font-bold text-white mb-2">{selectedAccount.title}</h3>
                <p className="text-gray-400">האם אתה בטוח שברצונך למחוק חשבון זה?</p>
              </div>
              
              <div>
                <Label htmlFor="delete-code">הזן קוד מחיקה</Label>
                <Input
                  id="delete-code"
                  type="text"
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="הזן קוד מחיקה..."
                  data-testid="delete-code-input"
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteCode('');
                    setSelectedAccount(null);
                  }}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  ביטול
                </Button>
                <Button 
                  onClick={confirmDeleteAccount}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                  data-testid="confirm-delete-btn"
                >
                  מחק חשבון
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className={`bg-gray-800 border-gray-700 text-white ${isAdmin ? 'max-w-4xl' : 'max-w-md'} h-[500px] flex flex-col`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {isAdmin ? 'ניהול שיחות' : 'צ'אט עם אדמין'}
            </DialogTitle>
          </DialogHeader>
          
          {isAdmin ? (
            /* Admin View - Conversations List */
            <div className="flex flex-1 gap-4">
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-600">
                <h3 className="text-lg font-semibold mb-4 p-4">שיחות ({conversations.length})</h3>
                <div className="overflow-y-auto max-h-[350px]">
                  {conversations.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      אין שיחות פעילות
                    </div>
                  ) : (
                    conversations.map((conv, index) => (
                      <div 
                        key={index}
                        onClick={() => openConversation(conv)}
                        className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${
                          activeConversation?.userEmail === conv.userEmail ? 'bg-gray-700' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {conv.userEmail.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{conv.userEmail}</div>
                            <div className="text-sm text-gray-400 truncate">
                              {conv.lastMessage.message}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(conv.lastMessage.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Active Conversation */}
              <div className="w-2/3 flex flex-col">
                {activeConversation ? (
                  <>
                    {/* Conversation Header */}
                    <div className="p-4 border-b border-gray-600">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {activeConversation.userEmail.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-semibold">{activeConversation.userEmail}</div>
                      </div>
                    </div>
                    
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 p-4">
                      {chatMessages.map((msg, index) => (
                        <div 
                          key={index} 
                          className={`flex ${
                            msg.is_admin ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div 
                            className={`max-w-xs p-3 rounded-lg ${
                              msg.is_admin
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-700 text-white'
                            }`}
                          >
                            <div className="text-sm font-semibold mb-1">
                              {msg.is_admin ? 'אתה (אדמין)' : msg.sender_email}
                            </div>
                            <div className="text-sm">{msg.message}</div>
                            <div className="text-xs opacity-70 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Message Input */}
                    <div className="flex gap-2 p-4 border-t border-gray-600">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={`שלח הודעה ל-${activeConversation.userEmail}...`}
                        className="flex-1 bg-gray-700 border-gray-600 text-white"
                        data-testid="chat-input"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid="send-message-btn"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    בחר שיחה כדי להתחיל לצ'אט
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Regular User View */
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-900 rounded-lg">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    שלח הודעה לאדמין
                  </div>
                )}
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex ${
                      msg.sender_email === userEmail ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div 
                      className={`max-w-xs p-3 rounded-lg ${
                        msg.sender_email === userEmail
                          ? 'bg-cyan-500 text-black' 
                          : 'bg-green-600 text-white'
                      }`}
                    >
                      <div className="text-sm font-semibold mb-1">
                        {msg.sender_email === userEmail ? 'אתה' : 'אדמין'}
                      </div>
                      <div className="text-sm">{msg.message}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Message Input */}
              <div className="flex gap-2 pt-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="כתוב הודעה..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white"
                  data-testid="chat-input"
                />
                <Button 
                  onClick={handleSendMessage}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black"
                  data-testid="send-message-btn"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}

export default App;