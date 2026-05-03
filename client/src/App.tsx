import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ClipboardList, Home, Moon, Settings as SettingsIcon, Sun, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import type { Lead, Settings, UpdateSettings } from "@shared/schema";

type PackageKey = "good" | "better" | "best";
type EstimatorState = {
  zipCode: string;
  address: string;
  homeSquareFeet: number;
  stories: "one" | "two";
  pitch: "standard" | "steep";
  complexity: "simple" | "complex";
  tearOff: "yes" | "no";
  selectedPackage: PackageKey;
};
type ContactForm = { name: string; email: string; phone: string };

const defaultEstimator: EstimatorState = {
  zipCode: "",
  address: "",
  homeSquareFeet: 2200,
  stories: "one",
  pitch: "standard",
  complexity: "simple",
  tearOff: "yes",
  selectedPackage: "better",
};

const packageCopy: Record<PackageKey, { label: string; deck: string; features: string[] }> = {
  good: {
    label: "Good",
    deck: "Reliable architectural shingle system for a clean, code-ready replacement.",
    features: ["Architectural shingles", "Synthetic underlayment", "Standard workmanship warranty"],
  },
  better: {
    label: "Better",
    deck: "A stronger roof system with upgraded accessories and warranty confidence.",
    features: ["Premium architectural shingles", "Ice and water barrier upgrades", "Enhanced warranty review"],
  },
  best: {
    label: "Best",
    deck: "Top-tier materials, ventilation review, and the most complete protection package.",
    features: ["Designer shingle options", "Full system accessory upgrade", "Priority scheduling consultation"],
  },
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function calculateEstimate(settings: Settings | undefined, state: EstimatorState) {
  const s = settings;
  const baseSquares = Math.max(10, (Number(state.homeSquareFeet || 0) * (state.stories === "two" ? 0.72 : 1.05)) / 100);
  const waste = 1 + ((s?.wastePercent ?? 12) / 100);
  const pitch = state.pitch === "steep" ? s?.steepPitchMultiplier ?? 1.1 : 1;
  const complexity = state.complexity === "complex" ? s?.complexRoofMultiplier ?? 1.14 : 1;
  const stories = state.stories === "two" ? s?.twoStoryMultiplier ?? 1.06 : 1;
  const estimatedSquares = Math.ceil(baseSquares * waste * pitch * complexity * stories * 10) / 10;
  const tearOff = state.tearOff === "yes" ? (s?.tearOffPerSquare ?? 65) * estimatedSquares : 0;
  const prices: Record<PackageKey, number> = {
    good: s?.goodPricePerSquare ?? 460,
    better: s?.betterPricePerSquare ?? 540,
    best: s?.bestPricePerSquare ?? 650,
  };
  const packages = (Object.keys(prices) as PackageKey[]).reduce(
    (acc, key) => {
      const midpoint = estimatedSquares * prices[key] + tearOff;
      acc[key] = {
        low: Math.round(midpoint * 0.93),
        high: Math.round(midpoint * 1.08),
        midpoint: Math.round(midpoint),
      };
      return acc;
    },
    {} as Record<PackageKey, { low: number; high: number; midpoint: number }>,
  );

  return { estimatedSquares, packages };
}

function Logo() {
  return (
    <div className="flex items-center gap-2 sm:gap-3" aria-label="Ridge Quote">
      <svg className="h-8 w-8 text-primary sm:h-9 sm:w-9" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M5 27.5 24 10l19 17.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 26.5v13h24v-13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 31h12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <div>
        <div className="whitespace-nowrap text-sm font-semibold leading-tight">Ridge Quote</div>
        <div className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">Roof replacement estimator</div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      data-testid="button-theme"
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

function Header() {
  const [location] = useLocation();
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" data-testid="link-home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant={location === "/" ? "secondary" : "ghost"} asChild>
            <Link href="/" data-testid="link-estimator">Estimator</Link>
          </Button>
          <Button variant={location === "/admin" ? "secondary" : "ghost"} asChild>
            <Link href="/admin" data-testid="link-admin">Pricing</Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function ChoiceButton({
  active,
  title,
  description,
  onClick,
  testId,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${active ? "border-primary bg-primary/10" : "border-card-border bg-card hover-elevate"}`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
    </button>
  );
}

function EstimatorPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [estimator, setEstimator] = useState<EstimatorState>(defaultEstimator);
  const estimatorCardRef = useRef<HTMLDivElement>(null);
  const form = useForm<ContactForm>({ defaultValues: { name: "", email: "", phone: "" } });
  const { data: settings, isLoading } = useQuery<Settings>({ queryKey: ["/api/settings"] });
  const estimate = useMemo(() => calculateEstimate(settings, estimator), [settings, estimator]);
  const selected = estimate.packages[estimator.selectedPackage];
  const steps = ["Home", "Roof", "Packages", "Contact"];

  useEffect(() => {
    if (step > 0) {
      window.requestAnimationFrame(() => {
        estimatorCardRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      });
    }
  }, [step]);

  const leadMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      const res = await apiRequest("POST", "/api/leads", {
        ...data,
        address: estimator.address,
        zipCode: estimator.zipCode,
        homeSquareFeet: Number(estimator.homeSquareFeet),
        stories: estimator.stories,
        pitch: estimator.pitch,
        complexity: estimator.complexity,
        tearOff: estimator.tearOff,
        selectedPackage: estimator.selectedPackage,
        estimatedSquares: estimate.estimatedSquares,
        lowEstimate: selected.low,
        highEstimate: selected.high,
        packageEstimatesJson: JSON.stringify(estimate.packages),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Estimate saved", description: "The customer estimate is ready for follow-up." });
      setStep(4);
    },
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-7">
          <Badge variant="outline" className="w-fit" data-testid="text-market">{settings?.marketName ?? "Local roofing market"}</Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Give homeowners a fast roof replacement estimate before they call.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              A guided quote experience for roof replacement leads. Customers answer a few practical questions, compare Good, Better, and Best options, then submit their contact details for follow-up.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Instant range", "Editable pricing", "Lead ready"].map((item) => (
              <div key={item} className="rounded-lg bg-card p-4 text-sm" data-testid={`text-benefit-${item.toLowerCase().replaceAll(" ", "-")}`}>
                <Check className="mb-3 h-4 w-4 text-primary" />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <Card ref={estimatorCardRef} className="scroll-mt-24 shadow-lg">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl">Roof estimate</CardTitle>
              <div className="flex gap-1">
                {steps.map((label, index) => (
                  <span key={label} className={`h-2 w-10 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} aria-label={`${label} step`} />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-3" data-testid="status-loading">
                <div className="h-10 rounded-md bg-muted" />
                <div className="h-24 rounded-md bg-muted" />
              </div>
            ) : null}

            {step === 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Property address</Label>
                  <Input id="address" data-testid="input-address" value={estimator.address} onChange={(event) => setEstimator({ ...estimator, address: event.target.value })} placeholder="123 Ridge Road" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP code</Label>
                    <Input id="zip" data-testid="input-zip" value={estimator.zipCode} onChange={(event) => setEstimator({ ...estimator, zipCode: event.target.value })} placeholder="29690" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sqft">Approx. home square feet</Label>
                    <Input id="sqft" data-testid="input-square-feet" type="number" value={estimator.homeSquareFeet} onChange={(event) => setEstimator({ ...estimator, homeSquareFeet: Number(event.target.value) })} />
                  </div>
                </div>
                <Button data-testid="button-next-roof" onClick={() => setStep(1)} disabled={!estimator.address || !estimator.zipCode}>Continue <ArrowRight /></Button>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceButton active={estimator.stories === "one"} title="One story" description="Most work can be staged from lower rooflines." testId="button-one-story" onClick={() => setEstimator({ ...estimator, stories: "one" })} />
                  <ChoiceButton active={estimator.stories === "two"} title="Two story" description="Adds access and safety considerations." testId="button-two-story" onClick={() => setEstimator({ ...estimator, stories: "two" })} />
                  <ChoiceButton active={estimator.pitch === "standard"} title="Standard pitch" description="Typical walkable or moderately sloped roof." testId="button-standard-pitch" onClick={() => setEstimator({ ...estimator, pitch: "standard" })} />
                  <ChoiceButton active={estimator.pitch === "steep"} title="Steep pitch" description="Requires more labor and fall protection." testId="button-steep-pitch" onClick={() => setEstimator({ ...estimator, pitch: "steep" })} />
                  <ChoiceButton active={estimator.complexity === "simple"} title="Simple roof" description="Mostly open planes with fewer valleys." testId="button-simple-roof" onClick={() => setEstimator({ ...estimator, complexity: "simple" })} />
                  <ChoiceButton active={estimator.complexity === "complex"} title="Complex roof" description="Dormers, valleys, hips, or several sections." testId="button-complex-roof" onClick={() => setEstimator({ ...estimator, complexity: "complex" })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceButton active={estimator.tearOff === "yes"} title="Tear off old roof" description="Most replacements need old shingles removed." testId="button-tearoff-yes" onClick={() => setEstimator({ ...estimator, tearOff: "yes" })} />
                  <ChoiceButton active={estimator.tearOff === "no"} title="No tear off" description="Use only when removal is priced separately." testId="button-tearoff-no" onClick={() => setEstimator({ ...estimator, tearOff: "no" })} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" data-testid="button-back-home" onClick={() => setStep(0)}>Back</Button>
                  <Button data-testid="button-next-packages" onClick={() => setStep(2)}>See options <ArrowRight /></Button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-sm text-muted-foreground">Estimated roof size</div>
                  <div className="text-2xl font-semibold tabular-nums" data-testid="text-estimated-squares">{estimate.estimatedSquares.toFixed(1)} squares</div>
                </div>
                <div className="grid gap-3">
                  {(Object.keys(packageCopy) as PackageKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      data-testid={`button-package-${key}`}
                      onClick={() => setEstimator({ ...estimator, selectedPackage: key })}
                      className={`rounded-lg border p-4 text-left transition ${estimator.selectedPackage === key ? "border-primary bg-primary/10" : "border-card-border bg-card hover-elevate"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">{packageCopy[key].label}</div>
                          <p className="mt-1 text-sm text-muted-foreground">{packageCopy[key].deck}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Estimate range</div>
                          <div className="font-semibold tabular-nums" data-testid={`text-price-${key}`}>{currency(estimate.packages[key].low)}–{currency(estimate.packages[key].high)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" data-testid="button-back-roof" onClick={() => setStep(1)}>Back</Button>
                  <Button data-testid="button-next-contact" onClick={() => setStep(3)}>Save this estimate <ArrowRight /></Button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <form className="space-y-4" onSubmit={form.handleSubmit((data) => leadMutation.mutate(data))}>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-sm text-muted-foreground">{packageCopy[estimator.selectedPackage].label} package range</div>
                  <div className="text-2xl font-semibold tabular-nums" data-testid="text-selected-estimate">{currency(selected.low)}–{currency(selected.high)}</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" data-testid="input-name" {...form.register("name", { required: true })} />
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" data-testid="input-email" type="email" {...form.register("email", { required: true })} />
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" data-testid="input-phone" {...form.register("phone", { required: true })} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">This is a planning range, not a final contract price. A roof inspection, measurements, material selection, and local code requirements can change the final proposal.</p>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" data-testid="button-back-packages" onClick={() => setStep(2)}>Back</Button>
                  <Button type="submit" data-testid="button-submit-lead" disabled={leadMutation.isPending}>{leadMutation.isPending ? "Saving..." : "Request follow-up"}</Button>
                </div>
              </form>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5 rounded-lg bg-primary/10 p-5" data-testid="status-success">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary p-2 text-primary-foreground"><Check className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-xl font-semibold">Estimate captured</h2>
                    <p className="text-sm text-muted-foreground">The lead is stored in the admin area and ready for your sales workflow.</p>
                  </div>
                </div>
                <Button data-testid="button-start-over" onClick={() => { setEstimator(defaultEstimator); form.reset(); setStep(0); }}>Start another estimate</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5" /> What customers answer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>Address, approximate home square footage, roof complexity, pitch, stories, tear-off needs, and preferred roof package.</p>
            <p>The estimator uses adjustable backend pricing so your price-per-square stays under your control.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Home className="h-5 w-5" /> Package positioning</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {(Object.keys(packageCopy) as PackageKey[]).map((key) => (
              <div key={key} className="space-y-3 rounded-lg bg-muted p-4" data-testid={`card-package-${key}`}>
                <div className="font-semibold">{packageCopy[key].label}</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {packageCopy[key].features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function AdminPage() {
  const { toast } = useToast();
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const form = useForm<UpdateSettings>();

  useEffect(() => {
    if (settings) form.reset(settings);
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: UpdateSettings) => {
      const payload = {
        ...values,
        goodPricePerSquare: Number(values.goodPricePerSquare),
        betterPricePerSquare: Number(values.betterPricePerSquare),
        bestPricePerSquare: Number(values.bestPricePerSquare),
        wastePercent: Number(values.wastePercent),
        steepPitchMultiplier: Number(values.steepPitchMultiplier),
        complexRoofMultiplier: Number(values.complexRoofMultiplier),
        twoStoryMultiplier: Number(values.twoStoryMultiplier),
        tearOffPerSquare: Number(values.tearOffPerSquare),
      };
      const res = await apiRequest("PATCH", "/api/settings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Pricing updated", description: "New estimator pricing is live." });
    },
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-3">Admin</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Pricing control room</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Adjust the price per square and roof condition multipliers without changing the website code.</p>
        </div>
        <Button asChild variant="outline"><Link href="/" data-testid="link-preview">Preview estimator</Link></Button>
      </div>
      <Tabs defaultValue="pricing">
        <TabsList>
          <TabsTrigger value="pricing" data-testid="tab-pricing"><SettingsIcon className="mr-2 h-4 w-4" /> Pricing</TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads"><Wrench className="mr-2 h-4 w-4" /> Leads</TabsTrigger>
        </TabsList>
        <TabsContent value="pricing" className="mt-6">
          <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estimator settings</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[
                  ["companyName", "Company name", "text"],
                  ["marketName", "Market name", "text"],
                  ["goodPricePerSquare", "Good price per square", "number"],
                  ["betterPricePerSquare", "Better price per square", "number"],
                  ["bestPricePerSquare", "Best price per square", "number"],
                  ["wastePercent", "Waste percent", "number"],
                  ["steepPitchMultiplier", "Steep pitch multiplier", "number"],
                  ["complexRoofMultiplier", "Complex roof multiplier", "number"],
                  ["twoStoryMultiplier", "Two-story multiplier", "number"],
                  ["tearOffPerSquare", "Tear-off per square", "number"],
                  ["webhookUrl", "GoHighLevel webhook URL", "url"],
                ].map(([name, label, type]) => (
                  <div className={name === "webhookUrl" ? "space-y-2 lg:col-span-3" : "space-y-2"} key={name}>
                    <Label htmlFor={name}>{label}</Label>
                    <Input id={name} data-testid={`input-${name}`} type={type} step={type === "number" ? "0.01" : undefined} {...form.register(name as keyof UpdateSettings)} />
                  </div>
                ))}
                <div className="md:col-span-2 lg:col-span-3">
                  <Button type="submit" data-testid="button-save-settings" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save pricing"}</Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent estimate requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leads.length === 0 ? (
                <div className="rounded-lg bg-muted p-6 text-sm text-muted-foreground" data-testid="status-no-leads">No leads yet. Complete the estimator once to see submissions here.</div>
              ) : leads.map((lead) => (
                <div key={lead.id} className="grid gap-3 rounded-lg bg-muted p-4 md:grid-cols-[1fr_auto]" data-testid={`row-lead-${lead.id}`}>
                  <div>
                    <div className="font-semibold">{lead.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{lead.address}, {lead.zipCode} · {lead.email} · {lead.phone}</div>
                    <div className="mt-2 text-sm">Package: {packageCopy[lead.selectedPackage as PackageKey]?.label ?? lead.selectedPackage} · {lead.estimatedSquares.toFixed(1)} squares</div>
                  </div>
                  <div className="text-right font-semibold tabular-nums">{currency(lead.lowEstimate)}–{currency(lead.highEstimate)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function AppRouter() {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-background focus:p-3">Skip to content</a>
      <Header />
      <Switch>
        <Route path="/" component={EstimatorPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
