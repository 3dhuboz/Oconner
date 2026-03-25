import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, Search } from 'lucide-react';
import api from '../api';
import './Tickets.css';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    api.get(`/tickets${params}`).then(res => { setTickets(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filterStatus]);

  const filtered = tickets.filter(t =>
    t.subject?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticketNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s) => ({ 'open': 'badge-warning', 'in-progress': 'badge-info', 'waiting-on-customer': 'badge-gray', 'resolved': 'badge-success', 'closed': 'badge-gray' }[s] || 'badge-gray');
  const priorityColor = (p) => ({ 'low': 'badge-gray', 'medium': 'badge-info', 'high': 'badge-warning', 'critical': 'badge-danger' }[p] || 'badge-gray');

  return (
    <div className="tickets-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="tickets-header">
          <h1>Support Tickets</h1>
          <Link to="/tickets/new" className="btn btn-primary"><Plus size={16} /> New Ticket</Link>
        </div>

        <div className="tickets-toolbar card">
          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-group">
            <Filter size={16} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="waiting-on-customer">Waiting on Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="page-loading">Loading tickets...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state card">
            <h3>No tickets found</h3>
            <p>Create a new ticket to get support from our team.</p>
            <Link to="/tickets/new" className="btn btn-primary btn-sm"><Plus size={14} /> Create Ticket</Link>
          </div>
        ) : (
          <div className="tickets-table card">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ticket => (
                  <tr key={ticket._id}>
                    <td><Link to={`/tickets/${ticket._id}`} className="ticket-link">{ticket.ticketNumber}</Link></td>
                    <td><Link to={`/tickets/${ticket._id}`} className="ticket-subject">{ticket.subject}</Link></td>
                    <td><span className="badge badge-gray">{ticket.category?.replace(/-/g, ' ')}</span></td>
                    <td><span className={`badge ${priorityColor(ticket.priority)}`}>{ticket.priority}</span></td>
                    <td><span className={`badge ${statusColor(ticket.status)}`}>{ticket.status}</span></td>
                    <td className="td-date">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
