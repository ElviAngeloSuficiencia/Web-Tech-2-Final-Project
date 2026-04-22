import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CafeService } from '../../services/cafe.service';

type DashboardSummary = {
  activeSessions: number;
  completedSessions: number;
  totalMembers: number;
  activeMembers: number;
  availableComputers: number;
  totalComputers: number;
  occupiedComputers: number;
  maintenanceComputers: number;
  todayRevenue: number;
};

type ShowcaseItem = {
  title: string;
  category: string;
  description: string;
  image: string;
};

type BrandItem = {
  name: string;
  description: string;
  image: string;
};

type GameItem = {
  name: string;
  description: string;
  image: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  summary: DashboardSummary | null = null;
  adminName = '';
  debugMessage = 'Initializing dashboard...';
  isLoading = false;

  stats: {
    title: string;
    value: string | number;
    sub: string;
    icon: string;
    type: string;
  }[] = [];

  activity: {
    name: string;
    text: string;
    time: string;
    type: string;
    icon: string;
  }[] = [];

  currentSlide = 0;
  slideInterval: ReturnType<typeof setInterval> | null = null;

slides: ShowcaseItem[] = [
    {
      title: 'High-Performance Gaming PCs',
      category: 'Computer Brand',
      description: 'Experience smooth performance with café units built for gaming, browsing, and productivity.',
      image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1400&q=80'
    },
    {
      title: 'Top Brands Setups',
      category: 'Computer Brand',
      description: 'Reliable gaming desktops and monitors designed for fast response and immersive visuals.',
      image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1400&q=80'
    },
    {
      title: 'Valorant & Competitive Games',
      category: 'Featured Game',
      description: 'Play your favorite esports titles with fast machines, sharp displays, and responsive peripherals.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80'
    },
    {
      title: 'League, Dota, and More',
      category: 'Featured Game',
      description: 'Enjoy popular multiplayer games in a comfortable and high-speed café environment.',
      image: 'https://cdn.discordapp.com/attachments/1177595512220823582/1496520799819923538/References_arena___E-BLUE_ESPORTS.jpeg?ex=69ea2f1a&is=69e8dd9a&hm=101807e93e01fc5944a1f9234c425daa41a67c248818dd779068943b1cbd4a3a&'
    }
  ];

  computerBrands: BrandItem[] = [
  {
    name: 'NVIDIA',
    description: 'Industry-leading graphics cards delivering high FPS and smooth gaming performance.',
    image: 'https://media.discordapp.net/attachments/1177595512220823582/1496508883391484066/HP_Omen_Slim_16__FHD_144Hz_Gaming_Laptop_Intel_Core_Ultra_7_255H_RTX_5060_32GB_DDR5_1TB_PCIe_SSD_Wi-Fi_6_Windows_11_Pro_Black.jpeg?ex=69ea2401&is=69e8d281&hm=d984f97393ae27bba4f6911ec3dfde1e261cc17482cc3f795be9ef3b4ac4b200&=&format=webp&width=920&height=920'
  },
 
  {
    name: 'AMD',
    description: 'Powerful CPUs and GPUs known for multi-core performance and gaming efficiency.',
    image: 'https://media.discordapp.net/attachments/1177595512220823582/1496508601290854491/AMD_Ryzen_7_2700X_vs_3700X__Which_One_Has_Better_Value.jpeg?ex=69ea23be&is=69e8d23e&hm=0fdc11c175ef57b7d5d23c4ac419fd67d5fde558ec805030b66709fb86e48e40&=&format=webp&width=919&height=551'
  },
  {
    name: 'ViewSonic',
    description: 'Reliable gaming monitors built for durability and performance.',
    image: 'https://media.discordapp.net/attachments/1177595512220823582/1496512617391325326/ViewSonic_logo_1.jpeg?ex=69ea277b&is=69e8d5fb&hm=bcb0258cb549cfbb095651ccb6989978a6b91d17ff695148f10e6a72a326fa9d&=&format=webp&width=625&height=351'
  },
  {
    name: 'MSI',
    description: 'High-performance MSI gaming motherboard built for speed, stability, and next-level gaming power.',
    image: 'https://cdn.discordapp.com/attachments/1177595512220823582/1496509727964921867/download_1.jpeg?ex=69ea24ca&is=69e8d34a&hm=86c74f01c9cdb5078d3cae6a815faba374359c12a694c296c392ce1631cdd1a1&'
  },
  {
    name: 'Kingston',
    description: 'Premium peripherals, RAM, and cooling systems for high-performance setups.',
    image: 'https://cdn.discordapp.com/attachments/1177595512220823582/1496510152231358495/Kingston_Technology_logo_vector_eps_svg_free_download_-_Brandlogos_net.jpeg?ex=69ea2530&is=69e8d3b0&hm=978cf790427861ef473574987e8f0a168ced475e19aa353c515b46f9a9c2ef9b&'
  },
  {
    name: 'Red Dragon',
    description: 'Trusted gaming peripherals including keyboards, mice, and headsets.',
    image: 'https://media.discordapp.net/attachments/1177595512220823582/1496510480942895277/Redragon_Logo.jpeg?ex=69ea257e&is=69e8d3fe&hm=c88d178d7906287cc9794788e49ae8d2db6bf678cd5e54c0db79f5eb5645b142&=&format=webp&width=500&height=309'
  },

];
  featuredGames: GameItem[] = [
    {
      name: 'Valorant',
      description: 'A tactical shooter that is one of the most popular esports titles in internet cafés.',
      image: 'https://media.discordapp.net/attachments/1177595512220823582/1496513024125833256/Valorant__gra_wideo_Riot_Games_dostepna_na_Xbox_Series_i_PS5.jpeg?ex=69ea27dc&is=69e8d65c&hm=37dedc848b14c9cfa09efdd9e2c6d17d7a3705ef42341797abe941e7ddd754af&=&format=webp&width=919&height=516'
    },
    {
      name: 'Dota 2',
      description: 'A classic MOBA game loved by competitive players and long-session café gamers.',
      image: 'https://media.discordapp.net/attachments/1177595512220823582/1496513327273083040/dota_2_characters_-_Google_Search.jpeg?ex=69ea2825&is=69e8d6a5&hm=c84de89e0e984c5e8e7a4309849886e9f9f52cfc8ad1fc16f927f4400011b0c8&=&format=webp&width=920&height=518'
    },
    {
      name: 'League of Legends',
      description: 'Fast-paced team strategy gameplay that remains a favorite for group sessions.',
      image: 'https://media.discordapp.net/attachments/1177595512220823582/1496513222230937660/League_of_Legends.jpeg?ex=69ea280c&is=69e8d68c&hm=6b26cacad3590d58d052dc7b03be287c088a594071dd3c4f1a84c3c7b968481c&=&format=webp&width=885&height=930'
    },
    {
      name: 'Counter-Strike 2',
      description: 'A competitive FPS experience perfect for high-refresh-rate gaming café setups.',
      image: 'https://media.discordapp.net/attachments/1177595512220823582/1496513125304766644/Counter-Strike_2_CS_2_PC_System_Requirements_-_GINX_Esports_TV.jpeg?ex=69ea27f4&is=69e8d674&hm=135364e294a753582cc629e54fb53477c100c4b4f775b83349530104651bb865&=&format=webp&width=920&height=518'
    },

    {
      name: 'Tekken *',
      description: 'A competitive FPS experience perfect for high-refresh-rate gaming café setups.',
      image: 'https://media.discordapp.net/attachments/1177595512220823582/1496513710259437759/Test_Tekken_8_-_Un_seul_bras_les_tua_tous.jpeg?ex=69ea2880&is=69e8d700&hm=490c2149165f12075efebbe630d44b77a0ef0557ba85d7b98d4b78b5e5ceae36&=&format=webp&width=294&height=165'
    }
  ];
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly refreshMs = 5000;
  private readonly storageKey = 'dashboard_last_good_summary';

  constructor(
    private cafeService: CafeService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.startSlideShow();

    if (!isPlatformBrowser(this.platformId)) {
      this.debugMessage = 'Not running in browser.';
      this.setFallbackDashboard();
      return;
    }

    const admin = localStorage.getItem('adminUser');

    if (!admin) {
      this.router.navigateByUrl('/login');
      return;
    }

    try {
      const parsed = JSON.parse(admin);
      this.adminName = parsed.username || '';
    } catch {
      localStorage.removeItem('adminUser');
      this.router.navigateByUrl('/login');
      return;
    }

    this.restoreLastGoodSummary();
    this.startAutoRefresh();
    this.loadDashboard(true);
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopSlideShow();
  }

  private getEmptySummary(): DashboardSummary {
    return {
      activeSessions: 0,
      completedSessions: 0,
      totalMembers: 0,
      activeMembers: 0,
      availableComputers: 0,
      totalComputers: 0,
      occupiedComputers: 0,
      maintenanceComputers: 0,
      todayRevenue: 0
    };
  }

  private setFallbackDashboard(): void {
    this.summary = this.getEmptySummary();
    this.buildStats();
    this.activity = [];
  }

  private restoreLastGoodSummary(): void {
    try {
      const cached = localStorage.getItem(this.storageKey);

      if (cached) {
        this.summary = JSON.parse(cached) as DashboardSummary;
        this.buildStats();
        this.activity = [];
        this.debugMessage = 'Loaded cached dashboard while waiting for live data...';
        return;
      }
    } catch (error) {
      console.warn('Failed to restore cached dashboard summary:', error);
    }

    this.setFallbackDashboard();
    this.debugMessage = 'Showing fallback dashboard while waiting for live data...';
  }

  private saveLastGoodSummary(summary: DashboardSummary): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(summary));
    } catch (error) {
      console.warn('Failed to cache dashboard summary:', error);
    }
  }

  private hasUsefulData(summary: DashboardSummary): boolean {
    return (
      summary.totalMembers > 0 ||
      summary.totalComputers > 0 ||
      summary.todayRevenue > 0 ||
      summary.activeSessions > 0 ||
      summary.completedSessions > 0
    );
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Dashboard request timed out after ${timeoutMs} ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async loadDashboard(isFirstLoad = false): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.debugMessage = isFirstLoad
      ? 'Loading dashboard from API...'
      : `Refreshing dashboard... ${new Date().toLocaleTimeString()}`;

    try {
      const apiSummary = await this.withTimeout(
        this.cafeService.getDashboardSummaryFromApi(),
        6500
      );

      const nextSummary: DashboardSummary = {
        activeSessions: apiSummary.activeSessions ?? 0,
        completedSessions: apiSummary.completedSessions ?? 0,
        totalMembers: apiSummary.totalMembers ?? 0,
        activeMembers: apiSummary.activeMembers ?? 0,
        availableComputers: apiSummary.availableComputers ?? 0,
        totalComputers: apiSummary.totalComputers ?? 0,
        occupiedComputers: apiSummary.occupiedComputers ?? 0,
        maintenanceComputers: apiSummary.maintenanceComputers ?? 0,
        todayRevenue: apiSummary.todayRevenue ?? 0
      };

      const looksEmpty = !this.hasUsefulData(nextSummary);
      const hasPreviousGoodData = !!this.summary && this.hasUsefulData(this.summary);

      if (looksEmpty && hasPreviousGoodData) {
        console.warn('API returned empty dashboard data. Keeping previous values.');
        this.debugMessage = `API returned empty data at ${new Date().toLocaleTimeString()}, keeping last good values.`;
      } else {
        this.summary = nextSummary;
        this.saveLastGoodSummary(nextSummary);
        this.buildStats();
        this.activity = [];
        this.debugMessage = `Dashboard updated at ${new Date().toLocaleTimeString()}`;
      }
    } catch (error) {
      console.error('Dashboard load failed:', error);

      if (!this.summary) {
        this.restoreLastGoodSummary();
      }

      this.debugMessage = `Refresh failed at ${new Date().toLocaleTimeString()}, keeping last good data.`;
    } finally {
      this.isLoading = false;
    }
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.refreshInterval = setInterval(() => {
      this.loadDashboard(false);
    }, this.refreshMs);
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  buildStats(): void {
    const s = this.summary || this.getEmptySummary();

    this.stats = [
      {
        title: 'Active Sessions',
        value: s.activeSessions,
        sub: `${s.completedSessions} completed sessions`,
        icon: '⚡',
        type: 'blue'
      },
      {
        title: 'Total Members',
        value: s.totalMembers,
        sub: `${s.activeMembers} active members`,
        icon: '👥',
        type: 'green'
      },
      {
        title: 'Available Computers',
        value: `${s.availableComputers} / ${s.totalComputers}`,
        sub: `${s.occupiedComputers} in use`,
        icon: '🖥️',
        type: 'orange'
      },
      {
        title: "Today's Revenue",
        value: `₱${Number(s.todayRevenue).toLocaleString()}`,
        sub: `${s.maintenanceComputers} under maintenance`,
        icon: '💲',
        type: 'pink'
      }
    ];
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  startSlideShow(): void {
    this.stopSlideShow();

    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  stopSlideShow(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = null;
    }
  }
}