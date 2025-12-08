"use client";

import { useState } from "react";
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

type NavItem = {
  label: string;
  href?: string;
  action?: () => void;
};

export default function MainNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleToggleDrawer = () => setOpen((prev) => !prev);

  const handleLogout = () => {
    // TODO: qui puoi pulire eventuale sessione (localStorage, ecc.)
    router.push("/login");
  };

  const baseItems: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "Classifica", href: "/classifica" },
    { label: "Profilo", href: "/profilo" },
    { label: "Admin", href: "/admin" }, // poi possiamo renderlo visibile solo agli admin
  ];

  const logoutItem: NavItem = { label: "Esci", action: handleLogout };

  const navItems = [...baseItems, logoutItem];

  const isActive = (href?: string): boolean =>
    !!href && (pathname === href || pathname.startsWith(`${href}/`));

    return (
    <>
      {/* HEADER SENZA APPBAR MUI */}
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
            py: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* LOGO */}
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <Typography
              variant="h6"
              component={Link}
              href="/"
              sx={{
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
                color: "#f97316",
              }}
            >
              Fanta Claus
            </Typography>
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
              color: "#facc15", // dorato
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
