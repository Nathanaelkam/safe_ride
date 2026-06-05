'use client';
import { useState } from 'react';
import { Github, Linkedin, Mail, Code, Cpu, Globe } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { cn } from '@/utils/cn';

interface Engineer {
  id: string;
  name: string;
  title: string;
  bio: string;
  skills: string[];
  experience: string;
  image: string;
  social: {
    github?: string;
    linkedin?: string;
    email?: string;
  };
}

const engineers: Engineer[] = [
  {
    id: '1',
    name: 'Amagna Tchounkeu',
    title: 'Senior Software Engineer & Architect',
    bio: 'Passionate software architect with expertise in building scalable, secure applications. Specializes in full-stack development with a focus on user safety and innovative mobile solutions.',
    skills: ['React Native', 'Node.js', 'System Architecture', 'Cloud Infrastructure', 'Security'],
    experience: '8+ years',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face&auto=format',
    social: {
      github: '#',
      linkedin: '#',
      email: 'amagna@seva.cm'
    }
  },
  {
    id: '2',
    name: 'Kam Kamdem',
    title: 'Lead Software Engineer & Technical Architect',
    bio: 'Experienced technical architect passionate about creating safe, reliable transportation solutions. Expert in distributed systems and real-time applications.',
    skills: ['TypeScript', 'Microservices', 'Real-time Systems', 'Mobile Development', 'DevOps'],
    experience: '7+ years',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face&auto=format',
    social: {
      github: '#',
      linkedin: '#',
      email: 'kam@seva.cm'
    }
  }
];

export function AboutSection() {
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null);

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="text-center">
        <p className="text-cream/75 dark:text-cream/75 light:text-ink/75 max-w-2xl mx-auto leading-relaxed">
          Seva was created by experienced software engineers with a passion for building 
          technology that makes transportation safer for everyone in Cameroon.
        </p>
      </header>

      {/* Engineers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {engineers.map((engineer) => (
          <Card 
            key={engineer.id} 
            className={cn(
              "!p-8 transition-all duration-300 hover:shadow-lg cursor-pointer",
              selectedEngineer === engineer.id && "ring-2 ring-terracotta/30"
            )}
            onClick={() => setSelectedEngineer(
              selectedEngineer === engineer.id ? null : engineer.id
            )}
          >
            <div className="space-y-6">
              {/* Profile Image & Basic Info */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-2xl overflow-hidden ring-2 ring-cream/10 dark:ring-cream/10 light:ring-ink/10">
                    <img
                      src={engineer.image}
                      alt={engineer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-terracotta flex items-center justify-center">
                    <Code size={14} className="text-cream" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-xl tracking-tight text-cream dark:text-cream light:text-ink mb-1">
                    {engineer.name}
                  </h3>
                  <p className="text-terracotta text-sm font-medium mb-2">
                    {engineer.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-cream/55 dark:text-cream/55 light:text-ink/55">
                    <Cpu size={12} />
                    <span>{engineer.experience} experience</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75 leading-relaxed">
                {engineer.bio}
              </p>

              {/* Skills */}
              <div>
                <p className="text-xs uppercase tracking-wide text-cream/45 dark:text-cream/45 light:text-ink/45 mb-3">
                  Core Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {engineer.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs bg-terracotta/10 text-terracotta border border-terracotta/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-4 pt-2 border-t border-cream/10 dark:border-cream/10 light:border-ink/10">
                {engineer.social.github && (
                  <a
                    href={engineer.social.github}
                    className="text-cream/45 dark:text-cream/45 light:text-ink/45 hover:text-terracotta transition-colors"
                    aria-label="GitHub"
                  >
                    <Github size={16} />
                  </a>
                )}
                {engineer.social.linkedin && (
                  <a
                    href={engineer.social.linkedin}
                    className="text-cream/45 dark:text-cream/45 light:text-ink/45 hover:text-terracotta transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin size={16} />
                  </a>
                )}
                {engineer.social.email && (
                  <a
                    href={`mailto:${engineer.social.email}`}
                    className="text-cream/45 dark:text-cream/45 light:text-ink/45 hover:text-terracotta transition-colors"
                    aria-label="Email"
                  >
                    <Mail size={16} />
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Mission Statement */}
      <Card className="max-w-4xl mx-auto !p-8">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-terracotta/10 flex items-center justify-center mx-auto mb-4">
            <Globe size={20} className="text-terracotta" />
          </div>
          <h2 className="font-display text-2xl tracking-tight text-cream dark:text-cream light:text-ink">
            Our Mission
          </h2>
          <p className="text-cream/75 dark:text-cream/75 light:text-ink/75 max-w-2xl mx-auto leading-relaxed">
            We believe that technology should make transportation safer, more accessible, 
            and more reliable for everyone. Seva is our contribution to building a safer 
            Cameroon, one ride at a time.
          </p>
        </div>
      </Card>
    </div>
  );
}