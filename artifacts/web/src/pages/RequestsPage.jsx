import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header.jsx';
import { toast } from 'sonner';

const RequestsPage = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    request_type: 'tool',
    name: '',
    description: '',
    why_needed: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const fetchRequests = async () => {
    try {
      const records = await pb.collection('requests').getList(1, 50, {
        filter: `userId = "${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setRequests(records.items);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error("Please fill in required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        userId: currentUser.id,
        request_type: formData.request_type,
        status: 'pending',
        ...(formData.request_type === 'tool' ? {
          tool_name: formData.name,
          tool_why_needed: formData.why_needed
        } : {
          system_name: formData.name,
          system_description: formData.description,
          system_use_case: formData.why_needed
        })
      };

      await pb.collection('requests').create(data, { $autoCancel: false });
      toast.success("Request submitted successfully.");
      setFormData({ request_type: 'tool', name: '', description: '', why_needed: '' });
      fetchRequests();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs rounded font-medium">Approved</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs rounded font-medium">Rejected</span>;
      default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs rounded font-medium">Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Requests | Starks Global Group</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Submit a Request</h1>
          <p className="text-sm text-muted-foreground">Request a new tool review or system blueprint.</p>
        </div>

        {/* REQUEST FORM */}
        <div className="bg-card border border-border rounded-lg p-6 mb-12">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Request Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="radio" 
                    name="request_type" 
                    value="tool" 
                    checked={formData.request_type === 'tool'}
                    onChange={(e) => setFormData({...formData, request_type: e.target.value})}
                    className="text-primary focus:ring-primary"
                  />
                  Tool Review
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="radio" 
                    name="request_type" 
                    value="system" 
                    checked={formData.request_type === 'system'}
                    onChange={(e) => setFormData({...formData, request_type: e.target.value})}
                    className="text-primary focus:ring-primary"
                  />
                  System Blueprint
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {formData.request_type === 'tool' ? 'Tool Name' : 'System Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={formData.request_type === 'tool' ? 'e.g. Make.com' : 'e.g. Client Onboarding Automation'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Briefly describe what it does..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Why is this needed?
              </label>
              <textarea
                rows={2}
                value={formData.why_needed}
                onChange={(e) => setFormData({...formData, why_needed: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="How would this help your workflow?"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* SUBMITTED REQUESTS */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Submitted Requests</h2>
          
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 border border-dashed border-border rounded-lg text-center">
              You haven't submitted any requests yet.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(req => (
                <div key={req.id} className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-muted-foreground uppercase">{req.request_type}</span>
                      <h3 className="font-medium text-sm text-foreground">
                        {req.request_type === 'tool' ? req.tool_name : req.system_name}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {req.request_type === 'tool' ? req.tool_why_needed : req.system_description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.created).toLocaleDateString()}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default RequestsPage;