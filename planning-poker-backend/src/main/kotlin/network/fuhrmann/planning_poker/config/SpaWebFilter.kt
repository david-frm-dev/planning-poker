package network.fuhrmann.planning_poker.config

import org.springframework.context.annotation.Configuration
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono

@Configuration
class SpaWebFilter : WebFilter {
    override fun filter(exchange: ServerWebExchange, chain: WebFilterChain): Mono<Void> {
        val path = exchange.request.uri.path
        
        // Bedingungen für die Weiterleitung:
        // 1. Pfad beginnt nicht mit /api
        // 2. Pfad sieht nicht nach einer statischen Datei aus (enthält keinen Punkt)
        // 3. Pfad ist nicht bereits /index.html
        if (!path.startsWith("/api") && 
            !path.contains(".") && 
            path != "/" && 
            path != "/index.html") {
            
            return chain.filter(
                exchange.mutate()
                    .request(exchange.request.mutate().path("/index.html").build())
                    .build()
            )
        }
        
        return chain.filter(exchange)
    }
}