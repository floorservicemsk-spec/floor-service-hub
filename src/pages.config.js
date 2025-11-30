import Chat from './pages/Chat';
import KnowledgeBase from './pages/KnowledgeBase';
import Admin from './pages/Admin';
import FAQ from './pages/FAQ';
import Video from './pages/Video';
import Calculator from './pages/Calculator';
import Profile from './pages/Profile';
import SkuPicker from './pages/SkuPicker';
import AccountProfile from './pages/AccountProfile';
import AccountLegal from './pages/AccountLegal';
import AccountOrders from './pages/AccountOrders';
import Tips from './pages/Tips';
import TipDetail from './pages/TipDetail';
import HomeSplash from './pages/HomeSplash';
import index from './pages/index';
import Leaderboard from './pages/Leaderboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Chat": Chat,
    "KnowledgeBase": KnowledgeBase,
    "Admin": Admin,
    "FAQ": FAQ,
    "Video": Video,
    "Calculator": Calculator,
    "Profile": Profile,
    "SkuPicker": SkuPicker,
    "AccountProfile": AccountProfile,
    "AccountLegal": AccountLegal,
    "AccountOrders": AccountOrders,
    "Tips": Tips,
    "TipDetail": TipDetail,
    "HomeSplash": HomeSplash,
    "index": index,
    "Leaderboard": Leaderboard,
}

export const pagesConfig = {
    mainPage: "HomeSplash",
    Pages: PAGES,
    Layout: __Layout,
};