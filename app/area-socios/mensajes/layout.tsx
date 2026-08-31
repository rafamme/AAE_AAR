export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <><style>{`
    .messages-page,.message-thread-page,.message-compose-page{padding-bottom:72px}
    .message-thread-list{display:grid;gap:12px;margin-top:24px}
    .message-thread-card{display:flex;justify-content:space-between;gap:22px;align-items:center;background:#fff;border:1px solid #ddd6cc;border-radius:16px;padding:20px;text-decoration:none}
    .message-thread-card.unread{border-width:2px}
    .message-thread-card h2{margin:6px 0 7px;font-size:24px}
    .message-thread-card p{margin:0;color:#655f57;line-height:1.45;max-width:720px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .message-thread-card time{font-size:13px;color:#746d64;flex:0 0 auto}
    .message-compose-form,.message-reply-form{display:grid;gap:16px;background:#fff;border:1px solid #ddd6cc;border-radius:16px;padding:22px;max-width:760px}
    .message-compose-form label,.message-reply-form label{display:grid;gap:7px;font-weight:700}
    .message-compose-form select,.message-compose-form textarea,.message-reply-form textarea{width:100%;border:1px solid #cfc8bd;border-radius:10px;padding:11px 12px;background:#fff;color:#24211d}
    .message-history{display:grid;gap:12px;margin:24px 0;max-width:850px}
    .message-bubble{max-width:78%;background:#fff;border:1px solid #ddd6cc;border-radius:16px;padding:16px 18px}
    .message-bubble.mine{margin-left:auto;background:#eeeae3}
    .message-bubble p{white-space:pre-wrap;line-height:1.55;margin:10px 0 0}
    .message-meta{display:flex;justify-content:space-between;gap:14px;align-items:center;font-size:13px;color:#746d64}
    .message-meta strong{color:#24211d}
    .member-message-action{margin:14px 0 0}
    @media(max-width:640px){.message-thread-card{align-items:flex-start;flex-direction:column}.message-thread-card time{align-self:flex-start}.message-bubble{max-width:92%}}
  `}</style>{children}</>;
}
