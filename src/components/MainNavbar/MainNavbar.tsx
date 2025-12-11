"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconButton,
  Typography,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { fantaPalette } from "@/theme/fantaPalette";
import Image from "next/image";

type NavItem = {
  label: string;
  href?: string;
  action?: () => void;
};

type AuthState = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

// 🔹 Legge lo stato auth da localStorage (solo lato client)
function readAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { isLoggedIn: false, isAdmin: false };
  }

  const ownerId = window.localStorage.getItem("fanta_owner_id");
  const adminFlag = window.localStorage.getItem("fanta_is_admin");

  return {
    isLoggedIn: !!ownerId,
    isAdmin: adminFlag === "true",
  };
}

export default function MainNavbar() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>(() => readAuthState());

  const pathname = usePathname();
  const router = useRouter();

  const handleToggleDrawer = () => setOpen((prev) => !prev);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("fanta_owner_id");
      window.localStorage.removeItem("fanta_is_admin");
      // 🔔 Notifica a tutta l'app che l'auth è cambiata
      window.dispatchEvent(new Event("fanta-auth-change"));
    }
    router.push("/login");
    router.refresh();
  };

  // 🔔 Ascolta cambiamenti di auth (logout/login/altre tab)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === "fanta_owner_id" ||
        e.key === "fanta_is_admin" ||
        e.key === null // clear()
      ) {
        setAuth(readAuthState());
      }
    };

    const handleAuthCustomEvent = () => {
      setAuth(readAuthState());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("fanta-auth-change", handleAuthCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("fanta-auth-change", handleAuthCustomEvent);
    };
  }, []);

  const isActive = (href?: string): boolean =>
    !!href && (pathname === href || pathname.startsWith(`${href}/`));

  // 🔹 Voci base
  const navItems: NavItem[] = [{ label: "Home", href: "/" }];

  // 🔹 Aggiungo voci solo se loggato
  if (auth.isLoggedIn) {
    navItems.push(
      { label: "Classifica", href: "/classifica" },
      { label: "Profilo", href: "/profilo" }
    );

    if (auth.isAdmin) {
      navItems.push({ label: "Admin", href: "/admin" });
    }

    navItems.push({ label: "Esci", action: handleLogout });
  }

  return (
    <>
      {/* HEADER */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          backgroundColor: "rgba(3, 123, 45, 0.1)",
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            width: "100%",
            mx: "auto",
            px: { xs: 2, sm: 3 },
            py: 1.5,
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* LOGO */}
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              <Image
                src="/logo/fantaclaus.png"
                alt="Fanta Claus logo"
                width={80}
                height={80}
                style={{
                  width: "auto",
                  height: 52,
                }}
                priority
              />
            </Link>
          </Box>

          {/* MENU DESKTOP */}
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {navItems.map((item) =>
              item.href ? (
                <Button
                  key={item.label}
                  component={Link}
                  href={item.href}
                  size="small"
                  sx={{
                    textTransform: "none",
                    borderRadius: 999,
                    px: 2.5,
                    py: 0.75,
                    fontWeight: 500,
                    color: isActive(item.href)
                      ? fantaPalette.buttonText
                      : fantaPalette.textSecondary,
                    backgroundImage: isActive(item.href)
                      ? fantaPalette.buttonGradient
                      : "none",
                    boxShadow: isActive(item.href)
                      ? "0 6px 18px rgba(0,0,0,0.18)"
                      : "none",
                    "&:hover": {
                      backgroundImage: fantaPalette.buttonGradientHover,
                      color: fantaPalette.buttonText,
                      boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
                    },
                  }}
                >
                  {item.label}
                </Button>
              ) : (
                <Button
                  key={item.label}
                  size="small"
                  onClick={item.action}
                  startIcon={<LogoutIcon fontSize="small" />}
                  sx={{
                    textTransform: "none",
                    borderRadius: 999,
                    px: 2.5,
                    py: 0.75,
                    fontWeight: 500,
                    color: fantaPalette.textSecondary,
                    "&:hover": {
                      backgroundColor: "rgba(248,250,252,0.16)",
                    },
                  }}
                >
                  {item.label}
                </Button>
              )
            )}
          </Stack>

          {/* HAMBURGER MOBILE */}
          <IconButton
            edge="end"
            onClick={handleToggleDrawer}
            sx={{
              display: { xs: "flex", md: "none" },
              color: "#facc15",
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Box>

      {/* DRAWER MOBILE */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleToggleDrawer}
        PaperProps={{
          sx: {
            width: 260,
            bgcolor: fantaPalette.cardBg,
          },
        }}
      >
        <Box sx={{ px: 2, py: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, mb: 1, color: fantaPalette.textPrimary }}
          >
            Menu Fanta Claus
          </Typography>
        </Box>
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.label}
              component={item.href ? Link : "button"}
              href={item.href as string | undefined}
              onClick={() => {
                if (item.action) item.action();
                setOpen(false);
              }}
              selected={Boolean(isActive(item.href))}
            >
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  sx: { color: fantaPalette.textPrimary },
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </>
  );
}
