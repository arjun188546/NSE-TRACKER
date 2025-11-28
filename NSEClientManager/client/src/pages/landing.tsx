import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  LineChart, 
  Shield, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  Activity,
  Bell,
  Smartphone
} from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: <Activity className="w-6 h-6" />,
      title: "Real-time Stock Tracking",
      description: "Monitor NSE stocks with live price updates during market hours"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Results Calendar",
      description: "Never miss quarterly results with our comprehensive calendar"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced Analytics",
      description: "Deep insights with candlestick charts and delivery volume data"
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Smart Alerts",
      description: "Get notified about important market events and results"
    },
    {
      icon: <LineChart className="w-6 h-6" />,
      title: "Performance Metrics",
      description: "Track top performers and analyze market trends"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Reliable",
      description: "Bank-grade security with 99.9% uptime guarantee"
    }
  ];

  const benefits = [
    "Access to 3000+ NSE stocks",
    "Real-time price updates (5-second intervals)",
    "Quarterly results tracking with PDF analysis",
    "Candlestick & delivery volume charts",
    "Demo mode available (7-day free trial)",
    "Mobile responsive design"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">NSE TRACKER</span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/login")}
            >
              Sign In
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="container mx-auto px-6 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                <Zap className="w-3 h-3 mr-1" />
                Trusted by 10,000+ Investors
              </Badge>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Track NSE Stocks with
                <span className="text-primary"> Real-time Insights</span>
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Professional-grade stock analysis platform with live price tracking, 
                quarterly results calendar, and comprehensive market analytics.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8"
                  onClick={() => setLocation("/login")}
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8"
                  onClick={() => setLocation("/login")}
                >
                  Start Free Trial
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>7-day free trial</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl -z-10"></div>
              <Card className="border-2">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Market Overview</h3>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      Live
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {["RELIANCE", "TCS", "INFY"].map((symbol, i) => (
                      <div key={symbol} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div>
                          <div className="font-medium">{symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {["Reliance Industries", "Tata Consultancy", "Infosys Ltd"][i]}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ₹{[1549.50, 3149.80, 1536.30][i]}
                          </div>
                          <div className={`text-sm ${i === 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {i === 0 ? '+2.01%' : '-0.31%'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <Badge className="mb-4">Features</Badge>
          <h2 className="text-4xl font-bold mb-4">Everything you need to trade smarter</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful tools and insights to help you make informed investment decisions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-secondary/30 py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge>Why Choose Us</Badge>
              <h2 className="text-4xl font-bold">
                Built for serious investors and traders
              </h2>
              <p className="text-lg text-muted-foreground">
                Our platform provides institutional-grade tools with a user-friendly interface, 
                making professional stock analysis accessible to everyone.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="border-2">
                <CardContent className="p-6 text-center space-y-2">
                  <div className="text-4xl font-bold text-primary">3000+</div>
                  <div className="text-muted-foreground">NSE Stocks</div>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="p-6 text-center space-y-2">
                  <div className="text-4xl font-bold text-primary">5s</div>
                  <div className="text-muted-foreground">Update Interval</div>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="p-6 text-center space-y-2">
                  <div className="text-4xl font-bold text-primary">99.9%</div>
                  <div className="text-muted-foreground">Uptime</div>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="p-6 text-center space-y-2">
                  <div className="text-4xl font-bold text-primary">24/7</div>
                  <div className="text-muted-foreground">Support</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <Card className="border-2 bg-gradient-to-br from-primary/10 to-purple-500/10">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold">Ready to start trading smarter?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of investors who trust NSE Tracker for their stock analysis needs.
              Start your 7-day free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => setLocation("/login")}
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8"
              >
                <Smartphone className="w-5 h-5 mr-2" />
                Download App
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">NSE TRACKER</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 NSE Stock Analysis Platform. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary">Privacy Policy</a>
              <a href="#" className="hover:text-primary">Terms of Service</a>
              <a href="#" className="hover:text-primary">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
