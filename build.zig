const std = @import("std");
const zine = @import("zine");

pub fn build(b: *std.Build) !void {
    zine.website(b, .{
        .title = "Simon Hartcher's Blog",
        .host_url = "https://simonhartcher.com",
        .layouts_dir_path = "layouts",
        .content_dir_path = "content",
        .assets_dir_path = "assets",
        .static_assets = &.{},
        .build_assets = &.{
            .{
                .name = "zon",
                .lp = b.path("build.zig.zon"),
            },
            .{
                .name = "frontmatter",
                .lp = b.dependency("zine", .{}).path(
                    "frontmatter.ziggy-schema",
                ),
            },
        },
        .debug = true,
    });
}
