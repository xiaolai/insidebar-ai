#!/usr/bin/env python3
"""
Script to update extension icons from a source image.
Generates 16x16, 32x32, 48x48, and 128x128 PNG icons.
"""

from PIL import Image
import sys
import os

def create_icons(source_image_path):
    """Create icon files in multiple sizes from source image."""

    # Icon sizes needed for Chrome/Edge extensions
    sizes = [16, 32, 48, 128]

    # Icon output directory
    icon_dir = "icons"

    try:
        # Open source image
        img = Image.open(source_image_path)
        print(f"✓ Loaded source image: {source_image_path}")
        print(f"  Original size: {img.size}")

        # Convert to RGBA if needed
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
            print(f"  Converted to RGBA mode")

        # Generate icons in each size
        for size in sizes:
            # Resize with high-quality resampling
            resized = img.resize((size, size), Image.Resampling.LANCZOS)

            # Save to icons directory
            output_path = os.path.join(icon_dir, f"icon-{size}.png")
            resized.save(output_path, 'PNG')
            print(f"✓ Created {output_path} ({size}x{size})")

        print(f"\n✓ All icons created successfully!")
        print(f"  Location: {os.path.abspath(icon_dir)}/")

    except FileNotFoundError:
        print(f"✗ Error: Source image not found: {source_image_path}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 update-icon.py <source-image-path>")
        print("\nExample:")
        print("  python3 update-icon.py ~/Desktop/new-icon.png")
        sys.exit(1)

    source_path = sys.argv[1]

    # Expand user path if needed
    source_path = os.path.expanduser(source_path)

    print(f"insidebar.ai Icon Updater")
    print(f"=" * 50)

    create_icons(source_path)
