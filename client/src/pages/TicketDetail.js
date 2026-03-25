import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, Clock, User } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './TicketDetail.css';

const TicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/tickets/${id}`).then(res => { setTicket(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${id}/comments`, { message });
      setTicket(res.data);
      setMessage('');
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
    }
    setSending(false);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.put(`/tickets/${id}`, { status: newStatus });
      setTicket(res.data);
      toast.success(`Ticket marked as ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const statusColor = (s) => ({ 'open': 'badge-warning', 'in-progress': 'badge-info', 'waiting-on-customer': 'badge-gray', 'resolved': 'badge-success', 'closed': 'badge-gray' }[s] || 'badge-gray');
  const priorityColor = (p) => ({ 'low': 'badge-gray', 'medium': 'badge-info', 'high': 'badge-warning', 'critical': 'badge-danger' }[p] || 'badge-gray');

  if (loading) return <div className="page-loading">Loading ticket...</div>;
  if (!ticket) return <div className="page-loading">Ticket not found</div>;

  return (
    <div className="ticket-detail-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/tickets" className="back-link"><ArrowLeft size={16} /> Back to Tickets</Link>

        <div className="td-layout">
          <div className="td-main">
            <div className="td-header card">
              <div className="td-title-row">
                <span className="td-number">{ticket.ticketNumber}</span>
                <span className={`badge ${statusColor(ticket.status)}`}>{ticket.status}</span>
              </div>
              <h1>{ticket.subject}</h1>
              <div className="td-meta">
                <span className={`badge ${priorityColor(ticket.priority)}`}>{ticket.priority} priority</span>
                <span className="badge badge-gray">{ticket.category?.replace(/-/g, ' ')}</span>
                <span className="td-date"><Clock size={12} /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="td-description">{ticket.description}</div>
            </div>

            <div className="td-comments">
              <h3>Comments ({ticket.comments?.length || 0})</h3>
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments
                  .filter(c => !c.isInternal || user?.role !== 'customer')
                  .map((comment, idx) => (
                    <div key={idx} className={`comment card ${comment.user?._id === user?._id ? 'own' : ''} ${comment.isInternal ? 'internal' : ''}`}>
                      <div className="comment-header">
                        <div className="comment-avatar"><User size={14} /></div>
                        <strong>{comment.user?.firstName} {comment.user?.lastName}</strong>
                        <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{comment.user?.role}</span>
                        {comment.isInternal && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Internal</span>}
                        <span className="comment-date">{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="comment-body">{comment.message}</p>
                    </div>
                  ))
              ) : (
                <p className="no-comments">No comments yet. Start the conversation below.</p>
              )}

              <form className="comment-form card" onSubmit={handleComment}>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  required
                />
                <div className="comment-actions">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
                    {sending ? 'Sending...' : <><Send size={14} /> Send</>}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="td-sidebar">
            <div className="sidebar-card card">
              <h4>Details</h4>
              <div className="sidebar-row">
                <span>Status</span>
                <span className={`badge ${statusColor(ticket.status)}`}>{ticket.status}</span>
              </div>
              <div className="sidebar-row">
                <span>Priority</span>
                <span className={`badge ${priorityColor(ticket.priority)}`}>{ticket.priority}</span>
              </div>
              <div className="sidebar-row">
                <span>Category</span>
                <span>{ticket.category?.replace(/-/g, ' ')}</span>
              </div>
              <div className="sidebar-row">
                <span>Created</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              {ticket.assignedTo && (
                <div className="sidebar-row">
                  <span>Assigned To</span>
                  <span>{ticket.assignedTo.firstName} {ticket.assignedTo.lastName}</span>
                </div>
              )}
              {ticket.customer && (
                <div className="sidebar-row">
                  <span>Customer</span>
                  <span>{ticket.customer.firstName} {ticket.customer.lastName}</span>
                </div>
              )}
            </div>

            {(user?.role === 'admin' || user?.role === 'staff') && (
              <div className="sidebar-card card">
                <h4>Actions</h4>
                <div className="sidebar-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange('in-progress')}>Mark In Progress</button>
                  <button className="btn btn-sm btn-accent" onClick={() => handleStatusChange('waiting-on-customer')}>Waiting on Customer</button>
                  <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange('resolved')}>Mark Resolved</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleStatusChange('closed')}>Close Ticket</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
