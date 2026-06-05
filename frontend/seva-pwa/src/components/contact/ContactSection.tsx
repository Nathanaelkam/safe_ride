'use client';
import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, Shield } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { cn } from '@/utils/cn';

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="text-center">
        <p className="text-cream/75 dark:text-cream/75 light:text-ink/75 max-w-2xl mx-auto leading-relaxed">
          Have questions about Seva? Need technical support? Want to report a safety issue? 
          We're always ready to listen and help make your experience better.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Contact Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="!p-6">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
                  <Mail size={16} className="text-terracotta" />
                </div>
                <div>
                  <h3 className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink mb-2">
                    Email Us
                  </h3>
                  <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75 mb-2">
                    Get in touch via email
                  </p>
                  <div className="space-y-1">
                    <a href="mailto:support@seva.cm" className="text-terracotta hover:underline text-sm">
                      support@seva.cm
                    </a>
                    <br />
                    <a href="mailto:safety@seva.cm" className="text-terracotta hover:underline text-sm">
                      safety@seva.cm
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
                  <Phone size={16} className="text-terracotta" />
                </div>
                <div>
                  <h3 className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink mb-2">
                    Call Us
                  </h3>
                  <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75 mb-2">
                    24/7 emergency support
                  </p>
                  <a href="tel:+237670112880" className="text-terracotta hover:underline text-sm">
                    +237 670 112 880
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-terracotta" />
                </div>
                <div>
                  <h3 className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink mb-2">
                    Visit Us
                  </h3>
                  <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75">
                    Bastos, Yaoundé<br/>
                    Cameroun
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Help */}
          <Card className="!p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-terracotta" />
                <h3 className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink">
                  Emergency Support
                </h3>
              </div>
              <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75 leading-relaxed">
                If you're in immediate danger, contact local emergency services first. 
                For urgent safety issues with Seva, call our emergency line.
              </p>
              <Button size="sm" className="w-full">
                <Phone size={14} />
                Emergency: 117
              </Button>
            </div>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card className="!p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <MessageCircle size={20} className="text-terracotta" />
                <h2 className="font-display text-xl tracking-tight text-cream dark:text-cream light:text-ink">
                  Send us a message
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Your Name"
                    name="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cream/75 dark:text-cream/75 light:text-ink/75 mb-2">
                  Subject
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  required
                  className="w-full bg-transparent border border-cream/20 dark:border-cream/20 light:border-ink/20 rounded-xl px-4 py-3 text-cream dark:text-cream light:text-ink focus:border-terracotta outline-none transition-colors"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="technical">Technical Support</option>
                  <option value="safety">Safety Issue</option>
                  <option value="partnership">Business Partnership</option>
                  <option value="feedback">Feedback & Suggestions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cream/75 dark:text-cream/75 light:text-ink/75 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Tell us how we can help you..."
                  required
                  rows={6}
                  className="w-full bg-transparent border border-cream/20 dark:border-cream/20 light:border-ink/20 rounded-xl px-4 py-3 text-cream dark:text-cream light:text-ink focus:border-terracotta outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2 text-xs text-cream/55 dark:text-cream/55 light:text-ink/55">
                  <Clock size={12} />
                  <span>We typically respond within 24 hours</span>
                </div>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <Card className="max-w-4xl mx-auto !p-8">
        <div className="text-center space-y-6">
          <h2 className="font-display text-2xl tracking-tight text-cream dark:text-cream light:text-ink">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div>
              <h3 className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink mb-2">
                How does Seva ensure my safety?
              </h3>
              <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75">
                Seva tracks your location in real-time and alerts your emergency contacts 
                if anything seems wrong during your trip.
              </p>
            </div>
            
            <div>
              <h3 className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink mb-2">
                Is Seva free to use?
              </h3>
              <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75">
                Yes, Seva is completely free. We believe everyone deserves access 
                to safe transportation technology.
              </p>
            </div>
            
            <div>
              <h3 className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink mb-2">
                What if I don't have internet during my trip?
              </h3>
              <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75">
                Seva works offline and will sync your safety data when you reconnect 
                to ensure continuous protection.
              </p>
            </div>
            
            <div>
              <h3 className="font-display text-base tracking-tight text-cream dark:text-cream light:text-ink mb-2">
                Can I use Seva outside Cameroon?
              </h3>
              <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75">
                Currently, Seva is optimized for Cameroon. We're working on expanding 
                to other countries in the future.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}